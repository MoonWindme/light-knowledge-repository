package com.example.mdviewer.backend.dto;

public record NoteSummaryDto(
        String id,
        String title,
        String updatedAt,
        String folderId
) {
}
