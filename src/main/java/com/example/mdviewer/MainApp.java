package com.example.mdviewer;

import com.vladsch.flexmark.ast.BulletList;
import com.vladsch.flexmark.ast.Emphasis;
import com.vladsch.flexmark.ast.Heading;
import com.vladsch.flexmark.ast.ListItem;
import com.vladsch.flexmark.ast.OrderedList;
import com.vladsch.flexmark.ast.StrongEmphasis;
import com.vladsch.flexmark.ast.Text;
import com.vladsch.flexmark.parser.Parser;
import com.vladsch.flexmark.util.ast.Node;
import com.vladsch.flexmark.html.HtmlRenderer;
import com.vladsch.flexmark.util.data.MutableDataSet;
import javafx.application.Application;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Alert;
import javafx.scene.control.ButtonBar;
import javafx.scene.control.Button;
import javafx.scene.control.ButtonType;
import javafx.scene.control.CheckBox;
import javafx.scene.control.Label;
import javafx.scene.control.Menu;
import javafx.scene.control.MenuBar;
import javafx.scene.control.MenuItem;
import javafx.scene.control.Separator;
import javafx.scene.control.SplitPane;
import javafx.scene.control.TextArea;
import javafx.scene.control.TreeCell;
import javafx.scene.control.TreeItem;
import javafx.scene.control.TreeView;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;
import javafx.scene.web.WebEngine;
import javafx.scene.web.WebView;
import javafx.stage.DirectoryChooser;
import javafx.stage.FileChooser;
import javafx.stage.Stage;
import javafx.concurrent.Worker;
import javafx.animation.KeyFrame;
import javafx.animation.PauseTransition;
import javafx.animation.Timeline;
import javafx.util.Duration;
import org.openpdf.text.Chunk;
import org.openpdf.text.Document;
import org.openpdf.text.DocumentException;
import org.openpdf.text.Font;
import org.openpdf.text.FontFactory;
import org.openpdf.text.PageSize;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.pdf.PdfWriter;
import org.openpdf.text.List;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

public class MainApp extends Application {

    private final MutableDataSet markdownOptions = new MutableDataSet();
    private final Parser parser;
    private final HtmlRenderer htmlRenderer;
    private final WebView webView = new WebView();
    private final TextArea editor = new TextArea();
    private final Label fileLabel = new Label("未打开文件");
    private final Label wordCountLabel = new Label("字数: 0");
    private final Label autoSaveLabel = new Label("自动保存: 关闭");
    private final CheckBox autoSaveCheckBox = new CheckBox("自动保存");
    private final TreeView<Path> fileTree = new TreeView<>();

    private String currentMarkdown = "";
    private Path currentFilePath = null;
    private Path notebookRoot = null;
    private boolean dirty = false;
    private boolean internalUpdate = false;
    private boolean darkTheme = false;
    private Stage primaryStage;
    private long lastBackupMillis = 0L;

    // 自动保存相关：内容变化后 5 秒尝试保存 + 每 30 秒定时保存
    private final PauseTransition autoSaveDelay = new PauseTransition(Duration.seconds(5));
    private final Timeline autoSaveTimer = new Timeline(new KeyFrame(Duration.seconds(30), e -> autoSaveNow()));
    private static final Pattern WORD_PATTERN = Pattern.compile("[A-Za-z0-9]+");
    private static final DateTimeFormatter BACKUP_TIME = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");

    public MainApp() {
        markdownOptions.set(HtmlRenderer.FENCED_CODE_LANGUAGE_CLASS_PREFIX, "language-");
        parser = Parser.builder(markdownOptions).build();
        htmlRenderer = HtmlRenderer.builder(markdownOptions).build();
    }

    @Override
    public void start(Stage stage) {
        this.primaryStage = stage;
        WebEngine engine = webView.getEngine();
        engine.setJavaScriptEnabled(true);
        engine.getLoadWorker().stateProperty().addListener((obs, oldState, newState) -> {
            if (newState == Worker.State.SUCCEEDED) {
                try {
                    engine.executeScript("if (window.hljs) { hljs.highlightAll(); }");
                } catch (Exception ignored) {
                    // JS 加载失败时保持预览可用
                }
            }
        });
        Button newButton = new Button("新建");
        Button openButton = new Button("打开 .md");
        Button openFolderButton = new Button("打开文件夹");
        Button saveButton = new Button("保存");
        Button saveAsButton = new Button("另存为 .md");
        Button exportButton = new Button("导出为 PDF");

        newButton.setOnAction(e -> newMarkdown(stage));
        openButton.setOnAction(e -> openMarkdown(stage));
        openFolderButton.setOnAction(e -> chooseNotebookFolder(stage));
        saveButton.setOnAction(e -> saveMarkdown(stage));
        saveAsButton.setOnAction(e -> saveMarkdownAs(stage));
        exportButton.setOnAction(e -> exportPdf(stage));
        autoSaveCheckBox.setOnAction(e -> toggleAutoSave(autoSaveCheckBox.isSelected()));

        HBox toolbar = new HBox(10, newButton, openButton, openFolderButton, saveButton, saveAsButton, exportButton,
                new Separator(), autoSaveCheckBox, new Separator(), fileLabel);
        toolbar.setAlignment(Pos.CENTER_LEFT);
        toolbar.setPadding(new Insets(10));

        MenuBar menuBar = buildMenuBar(stage);

        // 文件树（左侧）
        fileTree.setShowRoot(false);
        fileTree.setPrefWidth(220);
        fileTree.setCellFactory(tv -> new TreeCell<>() {
            @Override
            protected void updateItem(Path item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) {
                    setText(null);
                } else {
                    setText(item.getFileName().toString());
                }
            }
        });
        fileTree.getSelectionModel().selectedItemProperty().addListener((obs, oldVal, newVal) -> {
            if (newVal != null && Files.isRegularFile(newVal.getValue())) {
                openMarkdownFile(newVal.getValue());
            }
        });

        // 中间编辑、右侧预览
        SplitPane editorPreview = new SplitPane();
        editor.setWrapText(true);
        editorPreview.getItems().addAll(editor, webView);
        editorPreview.setDividerPositions(0.5);

        // 最外层：文件树 + 编辑/预览
        SplitPane mainSplit = new SplitPane();
        mainSplit.getItems().addAll(fileTree, editorPreview);
        mainSplit.setDividerPositions(0.2);

        HBox statusBar = new HBox(16, wordCountLabel, autoSaveLabel);
        statusBar.setAlignment(Pos.CENTER_LEFT);
        statusBar.setPadding(new Insets(6, 10, 6, 10));

        BorderPane root = new BorderPane();
        root.setTop(new VBox(menuBar, toolbar));
        root.setCenter(mainSplit);
        root.setBottom(statusBar);

        Scene scene = new Scene(root, 900, 600);
        stage.setTitle("Markdown 预览与导出");
        stage.setScene(scene);
        stage.show();

        // 监听编辑器内容变化，实时更新预览与缓存
        editor.textProperty().addListener((obs, oldText, newText) -> {
            currentMarkdown = newText;
            updatePreview(newText);
            updateWordCount(newText);
            if (!internalUpdate) {
                dirty = true;
                scheduleAutoSaveIfNeeded();
            }
            updateTitle(primaryStage);
        });

        // 初始化空白预览
        setEditorText("");
        updateWordCount("");
        updateTitle(primaryStage);
        stage.setOnCloseRequest(event -> {
            if (!confirmContinueIfDirty(primaryStage)) {
                event.consume();
            }
        });

        // 初始化自动保存定时器
        autoSaveDelay.setOnFinished(e -> autoSaveNow());
        autoSaveTimer.setCycleCount(Timeline.INDEFINITE);
        applyTheme(false);
    }

    private MenuBar buildMenuBar(Stage stage) {
        Menu fileMenu = new Menu("文件");
        MenuItem newItem = new MenuItem("新建");
        MenuItem openItem = new MenuItem("打开");
        MenuItem openFolderItem = new MenuItem("打开文件夹");
        MenuItem saveItem = new MenuItem("保存");
        MenuItem saveAsItem = new MenuItem("另存为");
        MenuItem exitItem = new MenuItem("退出");
        newItem.setOnAction(e -> newMarkdown(stage));
        openItem.setOnAction(e -> openMarkdown(stage));
        openFolderItem.setOnAction(e -> chooseNotebookFolder(stage));
        saveItem.setOnAction(e -> saveMarkdown(stage));
        saveAsItem.setOnAction(e -> saveMarkdownAs(stage));
        exitItem.setOnAction(e -> {
            if (confirmContinueIfDirty(stage)) {
                stage.close();
            }
        });
        fileMenu.getItems().addAll(newItem, openItem, openFolderItem, saveItem, saveAsItem, exitItem);

        Menu viewMenu = new Menu("视图");
        MenuItem lightTheme = new MenuItem("浅色主题");
        MenuItem darkThemeItem = new MenuItem("深色主题");
        lightTheme.setOnAction(e -> applyTheme(false));
        darkThemeItem.setOnAction(e -> applyTheme(true));
        viewMenu.getItems().addAll(lightTheme, darkThemeItem);

        Menu toolMenu = new Menu("工具");
        MenuItem toggleAutoSave = new MenuItem("切换自动保存");
        toggleAutoSave.setOnAction(e -> {
            autoSaveCheckBox.setSelected(!autoSaveCheckBox.isSelected());
            toggleAutoSave(autoSaveCheckBox.isSelected());
        });
        toolMenu.getItems().add(toggleAutoSave);

        return new MenuBar(fileMenu, viewMenu, toolMenu);
    }

    private void newMarkdown(Stage stage) {
        if (!confirmContinueIfDirty(stage)) {
            return;
        }
        currentFilePath = null;
        dirty = false;
        fileLabel.setText("未保存的新文件");
        if (autoSaveCheckBox.isSelected()) {
            autoSaveLabel.setText("自动保存: 未打开文件");
        }
        setEditorText("");
        updateTitle(stage);
    }

    private void openMarkdown(Stage stage) {
        if (!confirmContinueIfDirty(stage)) {
            return;
        }
        FileChooser chooser = new FileChooser();
        chooser.setTitle("选择 Markdown 文件");
        chooser.getExtensionFilters().add(new FileChooser.ExtensionFilter("Markdown 文件", "*.md"));
        File file = chooser.showOpenDialog(stage);
        if (file == null) {
            return;
        }

        openMarkdownFile(file.toPath());
    }

    private void openMarkdownFile(Path path) {
        if (!confirmContinueIfDirty(primaryStage)) {
            return;
        }
        try {
            // 读取原始 Markdown 内容
            currentMarkdown = Files.readString(path, StandardCharsets.UTF_8);
            currentFilePath = path;
            fileLabel.setText(path.toAbsolutePath().toString());
            dirty = false;
            // 放入编辑器，预览会由监听器自动更新
            setEditorText(currentMarkdown);
            if (autoSaveCheckBox.isSelected()) {
                autoSaveLabel.setText("自动保存: 开启");
            }
            updateFileTreeSelection(path);
            updateTitle(primaryStage);
        } catch (IOException ex) {
            showError("读取文件失败", ex.getMessage());
        }
    }

    private void chooseNotebookFolder(Stage stage) {
        if (!confirmContinueIfDirty(stage)) {
            return;
        }
        DirectoryChooser chooser = new DirectoryChooser();
        chooser.setTitle("选择笔记本目录");
        File folder = chooser.showDialog(stage);
        if (folder == null) {
            return;
        }
        notebookRoot = folder.toPath();
        buildFileTree(notebookRoot);
    }

    private void buildFileTree(Path root) {
        TreeItem<Path> rootItem = new TreeItem<>(root);
        rootItem.setExpanded(true);
        fileTree.setRoot(rootItem);
        addChildren(rootItem);
    }

    private void addChildren(TreeItem<Path> parent) {
        Path dir = parent.getValue();
        try (Stream<Path> stream = Files.list(dir)) {
            stream.sorted((a, b) -> a.getFileName().toString().compareToIgnoreCase(b.getFileName().toString()))
                    .forEach(path -> {
                        if (Files.isDirectory(path)) {
                            TreeItem<Path> item = new TreeItem<>(path);
                            item.setExpanded(false);
                            parent.getChildren().add(item);
                            addChildren(item);
                        } else if (path.getFileName().toString().toLowerCase().endsWith(".md")) {
                            parent.getChildren().add(new TreeItem<>(path));
                        }
                    });
        } catch (IOException ignored) {
        }
    }

    private void updateFileTreeSelection(Path path) {
        if (notebookRoot == null || fileTree.getRoot() == null) {
            return;
        }
        TreeItem<Path> found = findTreeItem(fileTree.getRoot(), path);
        if (found != null) {
            fileTree.getSelectionModel().select(found);
        }
    }

    private TreeItem<Path> findTreeItem(TreeItem<Path> root, Path target) {
        if (root.getValue().equals(target)) {
            return root;
        }
        for (TreeItem<Path> child : root.getChildren()) {
            TreeItem<Path> found = findTreeItem(child, target);
            if (found != null) {
                return found;
            }
        }
        return null;
    }

    private boolean saveMarkdown(Stage stage) {
        if (currentFilePath == null) {
            return saveMarkdownAs(stage);
        }
        return writeFileTo(currentFilePath, true);
    }

    private boolean saveMarkdownAs(Stage stage) {
        FileChooser chooser = new FileChooser();
        chooser.setTitle("另存为 Markdown");
        chooser.getExtensionFilters().add(new FileChooser.ExtensionFilter("Markdown 文件", "*.md"));
        File file = chooser.showSaveDialog(stage);
        if (file == null) {
            return false;
        }

        currentFilePath = file.toPath();
        if (autoSaveCheckBox.isSelected()) {
            autoSaveLabel.setText("自动保存: 开启");
        }
        return writeFileTo(currentFilePath, true);
    }

    private void exportPdf(Stage stage) {
        if (currentMarkdown.isEmpty()) {
            showInfo("没有可导出的内容，请先打开 Markdown 文件。");
            return;
        }
        FileChooser chooser = new FileChooser();
        chooser.setTitle("导出为 PDF");
        chooser.getExtensionFilters().add(new FileChooser.ExtensionFilter("PDF 文件", "*.pdf"));
        File file = chooser.showSaveDialog(stage);
        if (file == null) {
            return;
        }

        try {
            // 将 Markdown 解析为 AST，然后转换为 PDF 文档
            Node document = parser.parse(currentMarkdown);
            writePdf(document, file.toPath());
            showInfo("PDF 导出成功：" + file.getAbsolutePath());
        } catch (Exception ex) {
            showError("导出失败", ex.getMessage());
        }
    }

    private void toggleAutoSave(boolean enabled) {
        if (enabled) {
            if (currentFilePath == null) {
                autoSaveLabel.setText("自动保存: 未打开文件");
            } else {
                autoSaveLabel.setText("自动保存: 开启");
            }
            autoSaveTimer.playFromStart();
            scheduleAutoSaveIfNeeded();
        } else {
            autoSaveLabel.setText("自动保存: 关闭");
            autoSaveDelay.stop();
            autoSaveTimer.stop();
        }
    }

    private void scheduleAutoSaveIfNeeded() {
        if (!autoSaveCheckBox.isSelected()) {
            return;
        }
        if (currentFilePath == null) {
            autoSaveLabel.setText("自动保存: 未打开文件");
            return;
        }
        autoSaveDelay.playFromStart();
    }

    private void autoSaveNow() {
        if (!autoSaveCheckBox.isSelected()) {
            return;
        }
        if (currentFilePath == null || !dirty) {
            return;
        }
        boolean ok = writeFileTo(currentFilePath, false);
        if (ok) {
            autoSaveLabel.setText("自动保存: 已保存");
        } else {
            autoSaveLabel.setText("自动保存: 失败");
        }
    }

    private boolean confirmContinueIfDirty(Stage stage) {
        if (!dirty) {
            return true;
        }
        Alert alert = new Alert(Alert.AlertType.CONFIRMATION);
        alert.setTitle("未保存提示");
        alert.setHeaderText(null);
        alert.setContentText("内容尚未保存，是否继续？");

        ButtonType saveBt = new ButtonType("保存");
        ButtonType discardBt = new ButtonType("不保存");
        ButtonType cancelBt = new ButtonType("取消", ButtonBar.ButtonData.CANCEL_CLOSE);
        alert.getButtonTypes().setAll(saveBt, discardBt, cancelBt);

        Optional<ButtonType> result = alert.showAndWait();
        if (result.isEmpty() || result.get() == cancelBt) {
            return false;
        }
        if (result.get() == saveBt) {
            return saveMarkdown(stage);
        }
        return true;
    }

    private void setEditorText(String text) {
        internalUpdate = true;
        editor.setText(text);
        internalUpdate = false;
        dirty = false;
        updateTitle(primaryStage);
    }

    private void updateTitle(Stage stage) {
        String name = (currentFilePath == null) ? "未命名" : currentFilePath.getFileName().toString();
        String mark = dirty ? " *" : "";
        stage.setTitle("Markdown 预览与导出 - " + name + mark);
    }

    private void updateWordCount(String text) {
        int count = countWordLike(text);
        wordCountLabel.setText("字数: " + count);
    }

    private int countWordLike(String text) {
        int chineseCount = 0;
        StringBuilder ascii = new StringBuilder();
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (isCjk(c)) {
                chineseCount++;
                ascii.append(' ');
            } else if (Character.isLetterOrDigit(c)) {
                ascii.append(c);
            } else {
                ascii.append(' ');
            }
        }
        Matcher matcher = WORD_PATTERN.matcher(ascii.toString());
        int wordCount = 0;
        while (matcher.find()) {
            wordCount++;
        }
        return chineseCount + wordCount;
    }

    private boolean isCjk(char c) {
        Character.UnicodeBlock block = Character.UnicodeBlock.of(c);
        return block == Character.UnicodeBlock.CJK_UNIFIED_IDEOGRAPHS
                || block == Character.UnicodeBlock.CJK_UNIFIED_IDEOGRAPHS_EXTENSION_A
                || block == Character.UnicodeBlock.CJK_UNIFIED_IDEOGRAPHS_EXTENSION_B
                || block == Character.UnicodeBlock.CJK_COMPATIBILITY_IDEOGRAPHS
                || block == Character.UnicodeBlock.CJK_SYMBOLS_AND_PUNCTUATION
                || block == Character.UnicodeBlock.HALFWIDTH_AND_FULLWIDTH_FORMS;
    }

    private void applyTheme(boolean dark) {
        this.darkTheme = dark;
        if (dark) {
            editor.setStyle("-fx-control-inner-background:#1e1e1e; -fx-text-fill:#e6e6e6; "
                    + "-fx-highlight-fill:#264f78; -fx-highlight-text-fill:#ffffff;");
        } else {
            editor.setStyle("-fx-control-inner-background:#ffffff; -fx-text-fill:#111111; "
                    + "-fx-highlight-fill:#cce8ff; -fx-highlight-text-fill:#000000;");
        }
        // 预览区域样式也跟着更新
        updatePreview(currentMarkdown);
    }

    private boolean writeFileTo(Path path, boolean showDialog) {
        try {
            // 在覆盖之前做一次历史备份（避免每秒生成太多备份）
            maybeBackup(path);
            Files.writeString(path, currentMarkdown, StandardCharsets.UTF_8);
            dirty = false;
            fileLabel.setText(path.toAbsolutePath().toString());
            updateTitle(primaryStage);
            if (autoSaveCheckBox.isSelected()) {
                autoSaveLabel.setText("自动保存: 开启");
            }
            if (showDialog) {
                showInfo("保存成功：" + path.toAbsolutePath());
            }
            return true;
        } catch (IOException ex) {
            if (showDialog) {
                showError("保存失败", ex.getMessage());
            }
            return false;
        }
    }

    private void maybeBackup(Path path) {
        if (!Files.exists(path) || !dirty) {
            return;
        }
        long now = System.currentTimeMillis();
        // 至少间隔 60 秒才生成一份备份，避免过多文件
        if (now - lastBackupMillis < 60_000) {
            return;
        }
        try {
            Path backupDir = path.getParent().resolve(".mdviewer-backups");
            Files.createDirectories(backupDir);
            String baseName = path.getFileName().toString();
            String time = LocalDateTime.now().format(BACKUP_TIME);
            String backupName = baseName + "." + time + ".bak.md";
            Path backupPath = backupDir.resolve(backupName);
            Files.copy(path, backupPath, StandardCopyOption.REPLACE_EXISTING);
            lastBackupMillis = now;
        } catch (IOException ignored) {
            // 备份失败不影响正常保存
        }
    }

    private void updatePreview(String markdown) {
        // 使用 flexmark 将 Markdown 转为 HTML，再交给 WebView 预览
        String normalizedMarkdown = normalizeMarkdown(markdown);
        String htmlBody = htmlRenderer.render(parser.parse(normalizedMarkdown));
        String bodyStyle = darkTheme
                ? "background:#1e1e1e;color:#e6e6e6;"
                : "background:#ffffff;color:#111111;";
        String codeBg = darkTheme ? "#2d2d2d" : "#f2f2f2";
        String preBg = darkTheme ? "#252526" : "#f6f8fa";
        String html = """
                <html>
                  <head>
                    <meta charset="UTF-8">
                    <link rel="stylesheet"
                          href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/%s.min.css">
                    <script src="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/highlight.min.js"></script>
                    <script>
                      window.onload = () => {
                        // 自动识别语言并高亮（同时支持 ```java 这种语言标记）
                        if (window.hljs) {
                          hljs.highlightAll();
                        }
                      };
                    </script>
                    <style>
                      :root {
                        --text-normal: %s;
                        --text-muted: %s;
                        --bg-primary: %s;
                        --bg-secondary: %s;
                        --border-color: %s;
                        --code-bg: %s;
                        --pre-bg: %s;
                        --link-color: %s;
                      }
                      body {
                        font-family: "Inter", "Segoe UI", "Microsoft YaHei", Arial, sans-serif;
                        padding: 22px;
                        line-height: 1.7;
                        background: var(--bg-primary);
                        color: var(--text-normal);
                      }
                      h1, h2, h3, h4, h5, h6 { margin: 18px 0 8px; font-weight: 600; }
                      h1 { font-size: 1.8em; border-bottom: 1px solid var(--border-color); padding-bottom: 6px; }
                      h2 { font-size: 1.5em; border-bottom: 1px solid var(--border-color); padding-bottom: 4px; }
                      p { margin: 8px 0; }
                      a { color: var(--link-color); text-decoration: none; }
                      a:hover { text-decoration: underline; }
                      blockquote {
                        margin: 10px 0;
                        padding: 8px 12px;
                        border-left: 4px solid var(--border-color);
                        background: var(--bg-secondary);
                        color: var(--text-muted);
                      }
                      hr { border: none; border-top: 1px solid var(--border-color); margin: 16px 0; }
                      ul, ol { padding-left: 22px; margin: 6px 0; }
                      li { margin: 4px 0; }
                      pre {
                        background: var(--pre-bg);
                        padding: 12px 14px;
                        border-radius: 8px;
                        overflow-x: auto;
                      }
                      pre code {
                        font-family: "Fira Code", "JetBrains Mono", "Consolas", monospace;
                        font-size: 0.95em;
                      }
                      code {
                        background: var(--code-bg);
                        padding: 2px 4px;
                        border-radius: 4px;
                      }
                      table { border-collapse: collapse; margin: 8px 0; width: 100%%; }
                      th, td { border: 1px solid var(--border-color); padding: 6px 10px; }
                      th { background: var(--bg-secondary); }
                      img { max-width: 100%%; height: auto; border-radius: 6px; }
                    </style>
                  </head>
                  <body>
                """.formatted(
                darkTheme ? "github-dark" : "github",
                darkTheme ? "#e6e6e6" : "#1f2328",
                darkTheme ? "#b0b0b0" : "#57606a",
                darkTheme ? "#1e1e1e" : "#ffffff",
                darkTheme ? "#2a2a2a" : "#f6f8fa",
                darkTheme ? "#3b3b3b" : "#d0d7de",
                darkTheme ? "#2d2d2d" : "#f2f2f2",
                darkTheme ? "#252526" : "#f6f8fa",
                darkTheme ? "#4ea1ff" : "#0969da"
        ) + htmlBody + """
                  </body>
                </html>
                """;
        WebEngine engine = webView.getEngine();
        // 设置 baseUrl，保证 Markdown 中的相对图片路径可以正确显示
        String baseUrl = (currentFilePath != null && currentFilePath.getParent() != null)
                ? currentFilePath.getParent().toUri().toString()
                : Path.of(System.getProperty("user.dir")).toUri().toString();
        engine.loadContent(html, baseUrl);
    }

    private String normalizeMarkdown(String markdown) {
        if (markdown == null) {
            return "";
        }
        if (markdown.indexOf('｀') == -1) {
            return markdown;
        }
        return markdown.replace("｀｀｀", "```");
    }

    private void writePdf(Node document, Path outputPath) throws IOException, DocumentException {
        Document pdf = new Document(PageSize.A4, 36, 36, 36, 36);
        try (FileOutputStream out = new FileOutputStream(outputPath.toFile())) {
            PdfWriter.getInstance(pdf, out);
            pdf.open();

            PdfRenderer renderer = new PdfRenderer(pdf);
            renderer.render(document);
        } finally {
            // 无论成功与否，都尽量关闭文档，避免文件句柄被占用
            pdf.close();
        }
    }

    private void showInfo(String message) {
        Alert alert = new Alert(Alert.AlertType.INFORMATION);
        alert.setTitle("提示");
        alert.setHeaderText(null);
        alert.setContentText(message);
        alert.showAndWait();
    }

    private void showError(String title, String message) {
        Alert alert = new Alert(Alert.AlertType.ERROR);
        alert.setTitle(title);
        alert.setHeaderText(null);
        alert.setContentText(message);
        alert.showAndWait();
    }

    public static void main(String[] args) {
        launch(args);
    }

    /**
     * 将 flexmark 的 AST 渲染为 OpenPDF 文档。
     * 这里只处理常见元素：标题、段落、粗体、斜体、列表。
     */
    private static class PdfRenderer {
        private final Document pdf;
        private final Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 12);
        private final Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
        private final Font italicFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 12);
        private final Font h1Font = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22);
        private final Font h2Font = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
        private final Font h3Font = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);

        private PdfRenderer(Document pdf) {
            this.pdf = pdf;
        }

        private void render(Node node) throws DocumentException {
            Node child = node.getFirstChild();
            while (child != null) {
                if (child instanceof Heading heading) {
                    renderHeading(heading);
                } else if (child instanceof com.vladsch.flexmark.ast.Paragraph paragraph) {
                    renderParagraph(paragraph);
                } else if (child instanceof BulletList bulletList) {
                    renderList(bulletList, false);
                } else if (child instanceof OrderedList orderedList) {
                    renderList(orderedList, true);
                } else {
                    // 其他节点继续向下遍历
                    render(child);
                }
                child = child.getNext();
            }
        }

        private void renderHeading(Heading heading) throws DocumentException {
            int level = heading.getLevel();
            Font font = switch (level) {
                case 1 -> h1Font;
                case 2 -> h2Font;
                default -> h3Font;
            };
            Paragraph p = new Paragraph();
            p.add(buildPhrase(heading, font));
            p.setSpacingAfter(8f);
            pdf.add(p);
        }

        private void renderParagraph(com.vladsch.flexmark.ast.Paragraph paragraph) throws DocumentException {
            Paragraph p = new Paragraph();
            p.add(buildPhrase(paragraph, normalFont));
            p.setSpacingAfter(6f);
            pdf.add(p);
        }

        private void renderList(Node listNode, boolean ordered) throws DocumentException {
            List list = new List(ordered);
            list.setAutoindent(true);
            list.setIndentationLeft(16f);

            Node item = listNode.getFirstChild();
            while (item != null) {
                if (item instanceof ListItem listItem) {
                    org.openpdf.text.ListItem pdfItem = new org.openpdf.text.ListItem();
                    pdfItem.add(buildPhrase(listItem, normalFont));
                    list.add(pdfItem);
                }
                item = item.getNext();
            }
            pdf.add(list);
        }

        private Phrase buildPhrase(Node node, Font baseFont) {
            Phrase phrase = new Phrase();
            Node child = node.getFirstChild();
            while (child != null) {
                if (child instanceof Text text) {
                    phrase.add(new Chunk(text.getChars().toString(), baseFont));
                } else if (child instanceof StrongEmphasis) {
                    phrase.add(buildPhrase(child, boldFont));
                } else if (child instanceof Emphasis) {
                    phrase.add(buildPhrase(child, italicFont));
                } else if (child.getClass().getSimpleName().equals("SoftLineBreak")) {
                    phrase.add(new Chunk(" ", baseFont));
                } else if (child.getClass().getSimpleName().equals("HardLineBreak")) {
                    phrase.add(Chunk.NEWLINE);
                } else {
                    phrase.add(buildPhrase(child, baseFont));
                }
                child = child.getNext();
            }
            return phrase;
        }
    }
}
