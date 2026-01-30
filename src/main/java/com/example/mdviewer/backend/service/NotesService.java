package com.example.mdviewer.backend.service;

import com.example.mdviewer.backend.config.NotesProperties;
import com.example.mdviewer.backend.dto.CreateFolderRequest;
import com.example.mdviewer.backend.dto.CreateNoteRequest;
import com.example.mdviewer.backend.dto.FolderNodeDto;
import com.example.mdviewer.backend.dto.NoteDetailDto;
import com.example.mdviewer.backend.dto.NoteSummaryDto;
import com.example.mdviewer.backend.dto.UpdateFolderRequest;
import com.example.mdviewer.backend.dto.UpdateNoteRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileVisitOption;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;

@Service
public class NotesService {
    private static final String EXTENSION = ".md";
    private final Path root;

    public NotesService(NotesProperties properties) {
        this.root = properties.getRoot().toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "无法创建笔记目录", ex);
        }
    }

    public List<FolderNodeDto> loadFolderTree() {
        return listChildren(root);
    }

    public List<NoteSummaryDto> listNotes() {
        try (Stream<Path> stream = Files.walk(root, FileVisitOption.FOLLOW_LINKS)) {
            return stream
                    .filter(Files::isRegularFile)
                    .filter(this::isMarkdown)
                    .map(this::toSummary)
                    .sorted(Comparator.comparing(NoteSummaryDto::updatedAt).reversed())
                    .toList();
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "读取笔记列表失败", ex);
        }
    }

    public NoteDetailDto getNote(String id) {
        Path file = resolveNoteFile(id);
        try {
            String content = Files.readString(file, StandardCharsets.UTF_8);
            return toDetail(file, content);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "读取笔记失败", ex);
        }
    }

    public NoteDetailDto createNote(CreateNoteRequest request) {
        String title = sanitizeTitle(request.title(), "未命名");
        Path folder = request.folderId() == null ? root : resolveFolder(request.folderId());
        try {
            Files.createDirectories(folder);
            Path file = ensureUniqueFile(folder, toFileBaseName(title));
            String content = "# " + title + System.lineSeparator() + System.lineSeparator();
            Files.writeString(file, content, StandardCharsets.UTF_8);
            return toDetail(file, content);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "创建笔记失败", ex);
        }
    }

    public NoteDetailDto updateNote(String id, UpdateNoteRequest request) {
        Path file = resolveNoteFile(id);
        String existingTitle = stripExtension(file.getFileName().toString());
        String nextTitle = request.title() == null ? existingTitle : sanitizeTitle(request.title(), existingTitle);
        String content;
        try {
            content = request.content() == null
                    ? Files.readString(file, StandardCharsets.UTF_8)
                    : request.content();
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "读取笔记失败", ex);
        }

        Path targetFile = file;
        if (!nextTitle.equals(existingTitle)) {
            targetFile = renameFile(file, nextTitle);
        }

        try {
            Files.writeString(targetFile, content, StandardCharsets.UTF_8);
            return toDetail(targetFile, content);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "更新笔记失败", ex);
        }
    }

    public void deleteNote(String id) {
        Path file = resolveNoteFile(id);
        try {
            Files.deleteIfExists(file);
            cleanupEmptyParents(file.getParent());
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "删除笔记失败", ex);
        }
    }

    public FolderNodeDto createFolder(CreateFolderRequest request) {
        String name = sanitizeTitle(request.name(), "新建文件夹");
        Path parent = request.parentId() == null ? root : resolveFolder(request.parentId());
        Path folder = parent.resolve(name).normalize();
        if (!folder.startsWith(root)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "非法的文件夹路径");
        }
        if (Files.exists(folder)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "文件夹已存在");
        }
        try {
            Files.createDirectories(folder);
            return toFolderNode(folder, listChildren(folder));
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "创建文件夹失败", ex);
        }
    }

    public FolderNodeDto renameFolder(String id, UpdateFolderRequest request) {
        Path folder = resolveFolder(id);
        String name = sanitizeTitle(request.name(), folder.getFileName().toString());
        Path target = folder.getParent().resolve(name).normalize();
        if (!target.startsWith(root)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "非法的文件夹路径");
        }
        if (Files.exists(target)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "目标文件夹已存在");
        }
        try {
            Files.move(folder, target);
            return toFolderNode(target, listChildren(target));
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "重命名文件夹失败", ex);
        }
    }

    public void deleteFolder(String id) {
        Path folder = resolveFolder(id);
        try (Stream<Path> stream = Files.walk(folder)) {
            stream.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException ex) {
                    throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "删除文件夹失败", ex);
                }
            });
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "删除文件夹失败", ex);
        }
    }

    private List<FolderNodeDto> listChildren(Path folder) {
        if (!Files.isDirectory(folder)) {
            return List.of();
        }
        try (Stream<Path> stream = Files.list(folder)) {
            List<Path> directories = new ArrayList<>();
            List<Path> files = new ArrayList<>();
            stream.forEach(path -> {
                if (Files.isDirectory(path)) {
                    directories.add(path);
                } else if (isMarkdown(path)) {
                    files.add(path);
                }
            });
            directories.sort(Comparator.comparing(path -> path.getFileName().toString().toLowerCase(Locale.ROOT)));
            files.sort(Comparator.comparing(path -> path.getFileName().toString().toLowerCase(Locale.ROOT)));
            List<FolderNodeDto> nodes = new ArrayList<>();
            for (Path dir : directories) {
                nodes.add(toFolderNode(dir, listChildren(dir)));
            }
            for (Path file : files) {
                nodes.add(toFileNode(file));
            }
            return nodes;
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "读取目录失败", ex);
        }
    }

    private FolderNodeDto toFolderNode(Path folder, List<FolderNodeDto> children) {
        String id = encodeId(root.relativize(folder));
        return new FolderNodeDto(id, folder.getFileName().toString(), "folder", null, children);
    }

    private FolderNodeDto toFileNode(Path file) {
        String id = encodeId(root.relativize(file));
        return new FolderNodeDto(id, file.getFileName().toString(), "file", id, null);
    }

    private NoteSummaryDto toSummary(Path file) {
        String id = encodeId(root.relativize(file));
        String title = stripExtension(file.getFileName().toString());
        String updatedAt;
        try {
            updatedAt = Files.getLastModifiedTime(file).toInstant().toString();
        } catch (IOException ex) {
            updatedAt = Instant.now().toString();
        }
        String folderId = root.equals(file.getParent()) ? null : encodeId(root.relativize(file.getParent()));
        return new NoteSummaryDto(id, title, updatedAt, folderId);
    }

    private NoteDetailDto toDetail(Path file, String content) {
        String id = encodeId(root.relativize(file));
        String title = stripExtension(file.getFileName().toString());
        String updatedAt;
        try {
            updatedAt = Files.getLastModifiedTime(file).toInstant().toString();
        } catch (IOException ex) {
            updatedAt = Instant.now().toString();
        }
        String folderId = root.equals(file.getParent()) ? null : encodeId(root.relativize(file.getParent()));
        return new NoteDetailDto(id, title, updatedAt, folderId, content);
    }

    private Path resolveNoteFile(String id) {
        Path path = resolvePath(id);
        if (!isMarkdown(path)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "笔记格式不正确");
        }
        if (!Files.exists(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "笔记不存在");
        }
        if (!Files.isRegularFile(path)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "目标不是文件");
        }
        return path;
    }

    private Path resolveFolder(String id) {
        Path path = resolvePath(id);
        if (!Files.exists(path) || !Files.isDirectory(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "文件夹不存在");
        }
        return path;
    }

    private Path resolvePath(String id) {
        Path relative = decodeId(id);
        Path resolved = root.resolve(relative).normalize();
        if (!resolved.startsWith(root)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "非法路径");
        }
        return resolved;
    }

    private String encodeId(Path relativePath) {
        String normalized = relativePath.toString().replace('\\', '/');
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(normalized.getBytes(StandardCharsets.UTF_8));
    }

    private Path decodeId(String id) {
        if (id == null || id.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "缺少 ID");
        }
        String decoded;
        try {
            decoded = new String(Base64.getUrlDecoder().decode(id), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ID 解析失败", ex);
        }
        Path path = Path.of(decoded).normalize();
        if (decoded.isBlank() || path.isAbsolute() || path.startsWith("..")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "非法 ID");
        }
        return path;
    }

    private boolean isMarkdown(Path path) {
        return path.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(EXTENSION);
    }

    private String sanitizeTitle(String input, String fallback) {
        if (input == null) {
            return fallback;
        }
        String trimmed = input.trim();
        if (trimmed.isEmpty()) {
            return fallback;
        }
        String sanitized = trimmed.replaceAll("[\\\\/:*?\"<>|]", "_").replaceAll("\\s+", " ");
        return sanitized.isBlank() ? fallback : sanitized;
    }

    private String toFileBaseName(String title) {
        String cleaned = sanitizeTitle(title, "未命名");
        if (cleaned.toLowerCase(Locale.ROOT).endsWith(EXTENSION)) {
            return stripExtension(cleaned);
        }
        return cleaned;
    }

    private Path ensureUniqueFile(Path folder, String baseName) throws IOException {
        Path candidate = folder.resolve(baseName + EXTENSION);
        if (!Files.exists(candidate)) {
            return candidate;
        }
        for (int i = 1; i <= 100; i++) {
            Path next = folder.resolve(baseName + " (" + i + ")" + EXTENSION);
            if (!Files.exists(next)) {
                return next;
            }
        }
        throw new IOException("无法生成唯一文件名");
    }

    private Path renameFile(Path file, String nextTitle) {
        Path folder = file.getParent();
        try {
            Path target = ensureUniqueFile(folder, toFileBaseName(nextTitle));
            Files.move(file, target);
            return target;
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "重命名笔记失败", ex);
        }
    }

    private String stripExtension(String filename) {
        String lower = filename.toLowerCase(Locale.ROOT);
        if (lower.endsWith(EXTENSION)) {
            return filename.substring(0, filename.length() - EXTENSION.length());
        }
        int index = filename.lastIndexOf('.');
        return index > 0 ? filename.substring(0, index) : filename;
    }

    private void cleanupEmptyParents(Path start) throws IOException {
        Path current = start;
        while (current != null && !current.equals(root)) {
            try (Stream<Path> stream = Files.list(current)) {
                if (stream.findAny().isPresent()) {
                    return;
                }
            }
            Files.deleteIfExists(current);
            current = current.getParent();
        }
    }
}
