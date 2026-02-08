"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Paperclip, Video } from "lucide-react";

type AttachmentFieldsProps = {
  maxFiles?: number;
  labelClassName: string;
  inputClassName: string;
};

type InputKey = "attachment_file" | "attachment_photos" | "attachment_videos";

type FilePreview = {
  id: string;
  url: string | null;
  name: string;
  type: string;
};

function buildFileId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export default function AttachmentFields({
  maxFiles = 2,
  labelClassName,
  inputClassName,
}: AttachmentFieldsProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const [filesByInput, setFilesByInput] = useState<Record<InputKey, File[]>>({
    attachment_file: [],
    attachment_photos: [],
    attachment_videos: [],
  });
  const [error, setError] = useState<string | null>(null);

  const totalCount = useMemo(
    () =>
      filesByInput.attachment_file.length +
      filesByInput.attachment_photos.length +
      filesByInput.attachment_videos.length,
    [filesByInput]
  );

  const previews = useMemo(() => {
    const allFiles = [
      ...filesByInput.attachment_file,
      ...filesByInput.attachment_photos,
      ...filesByInput.attachment_videos,
    ];
    return allFiles.map((file) => ({
      id: buildFileId(file),
      url: file.type.startsWith("image/") || file.type.startsWith("video/")
        ? URL.createObjectURL(file)
        : null,
      name: file.name,
      type: file.type,
    }));
  }, [filesByInput]);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => {
        if (preview.url) URL.revokeObjectURL(preview.url);
      });
    };
  }, [previews]);

  function setInputFiles(input: HTMLInputElement | null, files: File[]) {
    if (!input) return;
    const dataTransfer = new DataTransfer();
    files.forEach((file) => dataTransfer.items.add(file));
    input.files = dataTransfer.files;
  }

  function clearAll() {
    setFilesByInput({
      attachment_file: [],
      attachment_photos: [],
      attachment_videos: [],
    });
    setError(null);
    setInputFiles(fileInputRef.current, []);
    setInputFiles(photoInputRef.current, []);
    setInputFiles(videoInputRef.current, []);
  }

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;

    const handleSubmit = () => clearAll();
    form.addEventListener("submit", handleSubmit);
    return () => form.removeEventListener("submit", handleSubmit);
  }, []);

  function handleChange(key: InputKey, files: FileList | null, input: HTMLInputElement | null) {
    const selected = files ? Array.from(files) : [];
    const existing = filesByInput[key];
    const otherCount = totalCount - existing.length;
    const available = Math.max(0, maxFiles - otherCount);
    const merged = [...existing, ...selected].filter((file, index, all) => {
      const id = buildFileId(file);
      return all.findIndex((item) => buildFileId(item) === id) === index;
    });
    const nextFiles = merged.slice(0, available);

    if (selected.length > nextFiles.length) {
      setError(`Maximum ${maxFiles} fichiers par post.`);
    } else {
      setError(null);
    }

    setInputFiles(input, nextFiles);
    setFilesByInput((prev) => ({ ...prev, [key]: nextFiles }));
  }

  function removeFile(previewId: string) {
    const next: Record<InputKey, File[]> = {
      attachment_file: [],
      attachment_photos: [],
      attachment_videos: [],
    };

    (Object.keys(filesByInput) as InputKey[]).forEach((key) => {
      next[key] = filesByInput[key].filter((file) => buildFileId(file) !== previewId);
    });

    setFilesByInput(next);
    setInputFiles(fileInputRef.current, next.attachment_file);
    setInputFiles(photoInputRef.current, next.attachment_photos);
    setInputFiles(videoInputRef.current, next.attachment_videos);
  }

  return (
    <div ref={rootRef} className="contents">
      <label className={labelClassName}>
        <Paperclip className="h-4 w-4" />
        <input
          ref={fileInputRef}
          type="file"
          name="attachment_file"
          className="sr-only"
          onChange={(event) =>
            handleChange("attachment_file", event.currentTarget.files, fileInputRef.current)
          }
        />
      </label>

      <label className={labelClassName}>
        <Image className="h-4 w-4" />
        <input
          ref={photoInputRef}
          type="file"
          name="attachment_photos"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) =>
            handleChange("attachment_photos", event.currentTarget.files, photoInputRef.current)
          }
        />
      </label>

      <label className={labelClassName}>
        <Video className="h-4 w-4" />
        <input
          ref={videoInputRef}
          type="file"
          name="attachment_videos"
          accept="video/*"
          multiple
          className="sr-only"
          onChange={(event) =>
            handleChange("attachment_videos", event.currentTarget.files, videoInputRef.current)
          }
        />
      </label>

      <div className="w-full ml-3 ">
        <div className="mt-2 text-xs text-muted-foreground">
          {totalCount > 0 ? `${totalCount} / ${maxFiles} fichiers sélectionnés` : "Aucun fichier"}
        </div>
        {error && <div className="mt-1 text-xs text-destructive">{error}</div>}
        {previews.length > 0 && (
          <div className="mt-2 space-y-2 flex">
            {previews.map((preview) => (
              <div
                key={preview.id}
                className={`${inputClassName} relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40`}
              >
                <button
                  type="button"
                  className="absolute right-2 top-2 h-6 w-6 rounded-full bg-background/80 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => removeFile(preview.id)}
                >
                  ×
                </button>
                {preview.url && preview.type.startsWith("image/") ? (
                  <img
                    src={preview.url}
                    alt={preview.name}
                    className="max-h-48 w-full object-contain"
                  />
                ) : preview.url && preview.type.startsWith("video/") ? (
                  <video src={preview.url} className="max-h-48 w-full object-contain" />
                ) : (
                  <div className="w-full px-3 py-4">
                    <span className="block truncate text-xs text-muted-foreground">
                      {preview.name}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
