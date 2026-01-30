package com.example.mdviewer.backend.dto;

public record CreateNoteRequest(
        String title,
        String folderId
) {
}
