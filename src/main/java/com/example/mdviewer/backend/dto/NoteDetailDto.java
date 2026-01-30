package com.example.mdviewer.backend.dto;

public record NoteDetailDto(
        String id,
        String title,
        String updatedAt,
        String folderId,
        String content
) {
}
