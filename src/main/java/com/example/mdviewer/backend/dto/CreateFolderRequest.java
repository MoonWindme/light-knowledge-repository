package com.example.mdviewer.backend.dto;

public record CreateFolderRequest(
        String name,
        String parentId
) {
}
