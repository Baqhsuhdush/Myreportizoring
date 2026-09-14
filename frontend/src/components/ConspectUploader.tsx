import { useEffect, useState, type ChangeEvent } from "react";

interface ConspectUploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

export default function ConspectUploader({
  files,
  onChange,
  disabled = false,
  maxFiles = 10,
}: ConspectUploaderProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const combined = [...files, ...selected].slice(0, maxFiles);
    onChange(combined);
    event.target.value = "";
  }

  function handleRemove(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  function handleMove(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;

    const orderedFiles = [...files];
    const [movedFile] = orderedFiles.splice(fromIndex, 1);
    orderedFiles.splice(toIndex, 0, movedFile);
    onChange(orderedFiles);
  }

  return (
    <div className="conspect-uploader">
      <label
        className={
          disabled || files.length >= maxFiles
            ? "conspect-uploader__input-label conspect-uploader__input-label--disabled"
            : "conspect-uploader__input-label"
        }
      >
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={disabled || files.length >= maxFiles}
          onChange={handleFileInput}
        />
        Добавить фото ({files.length}/{maxFiles})
      </label>

      {previews.length > 0 && (
        <ul className="conspect-uploader__previews">
          {previews.map((src, index) => (
            <li
              key={src}
              className={
                draggingIndex === index
                  ? "conspect-uploader__preview conspect-uploader__preview--dragging"
                  : "conspect-uploader__preview"
              }
              draggable={!disabled}
              onDragStart={(event) => {
                if (disabled) {
                  event.preventDefault();
                  return;
                }
                event.dataTransfer.effectAllowed = "move";
                setDraggingIndex(index);
              }}
              onDragOver={(event) => {
                if (!disabled) event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (draggingIndex !== null && !disabled) {
                  handleMove(draggingIndex, index);
                }
                setDraggingIndex(null);
              }}
              onDragEnd={() => setDraggingIndex(null)}
            >
              <button
                type="button"
                className="conspect-uploader__zoom"
                onClick={() => setPreviewImageUrl(src)}
                aria-label={`Увеличить страницу конспекта ${index + 1}`}
                title="Нажмите, чтобы увеличить"
              >
                <img src={src} alt={`Страница конспекта ${index + 1}`} draggable={false} />
              </button>
              <button
                type="button"
                className="conspect-uploader__remove"
                onClick={() => handleRemove(index)}
                disabled={disabled}
                aria-label="Удалить фото"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {previewImageUrl && (
        <div
          className="conspect-uploader__modal"
          role="dialog"
          aria-modal="true"
          aria-label="Увеличенное фото конспекта"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="conspect-uploader__modal-content" onClick={(event) => event.stopPropagation()}>
            <img src={previewImageUrl} alt="Увеличенная страница конспекта" />
            <button
              type="button"
              className="conspect-uploader__modal-close"
              onClick={() => setPreviewImageUrl(null)}
              aria-label="Закрыть увеличенное фото"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
