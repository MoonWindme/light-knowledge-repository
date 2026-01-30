package com.example.mdviewer.backend.dto;

import java.util.List;

public record FolderNodeDto(
        String id,
        String name,
        String type,
        String noteId,
        List<FolderNodeDto> children
) {
}
