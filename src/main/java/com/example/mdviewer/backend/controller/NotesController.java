package com.example.mdviewer.backend.controller;

import com.example.mdviewer.backend.dto.CreateFolderRequest;
import com.example.mdviewer.backend.dto.CreateNoteRequest;
import com.example.mdviewer.backend.dto.FolderNodeDto;
import com.example.mdviewer.backend.dto.NoteDetailDto;
import com.example.mdviewer.backend.dto.NoteSummaryDto;
import com.example.mdviewer.backend.dto.UpdateFolderRequest;
import com.example.mdviewer.backend.dto.UpdateNoteRequest;
import com.example.mdviewer.backend.service.NotesService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin
public class NotesController {
    private final NotesService notesService;

    public NotesController(NotesService notesService) {
        this.notesService = notesService;
    }

    @GetMapping("/notes")
    public List<NoteSummaryDto> listNotes() {
        return notesService.listNotes();
    }

    @GetMapping("/notes/{id}")
    public NoteDetailDto getNote(@PathVariable String id) {
        return notesService.getNote(id);
    }

    @PostMapping("/notes")
    public NoteDetailDto createNote(@RequestBody CreateNoteRequest request) {
        return notesService.createNote(request);
    }

    @PutMapping("/notes/{id}")
    public NoteDetailDto updateNote(@PathVariable String id, @RequestBody UpdateNoteRequest request) {
        return notesService.updateNote(id, request);
    }

    @DeleteMapping("/notes/{id}")
    public void deleteNote(@PathVariable String id) {
        notesService.deleteNote(id);
    }

    @GetMapping("/folders")
    public List<FolderNodeDto> getFolders() {
        return notesService.loadFolderTree();
    }

    @PostMapping("/folders")
    public FolderNodeDto createFolder(@RequestBody CreateFolderRequest request) {
        return notesService.createFolder(request);
    }

    @PutMapping("/folders/{id}")
    public FolderNodeDto renameFolder(@PathVariable String id, @RequestBody UpdateFolderRequest request) {
        return notesService.renameFolder(id, request);
    }

    @DeleteMapping("/folders/{id}")
    public void deleteFolder(@PathVariable String id) {
        notesService.deleteFolder(id);
    }
}
