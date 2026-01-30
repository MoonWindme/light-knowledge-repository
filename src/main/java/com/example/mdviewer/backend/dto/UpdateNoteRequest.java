package com.example.mdviewer.backend.dto;

public record UpdateNoteRequest(
        String title,
        String content
) {
}
