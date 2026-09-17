import {
  Camera,
  Check,
  ImagePlus,
  Info,
  Pencil,
  Plus,
  RefreshCw,
  ScanLine,
  Sparkles,
  Trash2,
  UploadCloud,
  Video,
  X,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import api from "../api";
import "../styles/ingredient_scanner.css";


export default function IngredientScanner({
  initialIngredients = [],
  onIngredientsConfirmed,
}) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const filesRef = useRef([]);

  const [files, setFiles] = useState([]);
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [draftIngredient, setDraftIngredient] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [dragging, setDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    return () => {
      filesRef.current.forEach(file =>
        URL.revokeObjectURL(file.preview)
      );
    };
  }, []);

  function addFiles(selectedFiles) {
    const incoming = Array.from(selectedFiles || [])
      .filter(file =>
        file.type.startsWith("image/") || file.type.startsWith("video/")
      )
      .slice(0, Math.max(0, 5 - files.length));

    if (!incoming.length) {
      setError("Please choose a photo or short video.");
      return;
    }

    setError("");
    setFiles(current => [
      ...current,
      ...incoming.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        isVideo: file.type.startsWith("video/"),
      })),
    ]);
  }

  function removeFile(index) {
    setFiles(current => {
      URL.revokeObjectURL(current[index].preview);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  async function scanIngredients() {
    if (!files.length) {
      setError("Add at least one photo or video before scanning.");
      return;
    }

    const formData = new FormData();
    files.forEach(item => formData.append("media", item.file));

    setScanning(true);
    setError("");

    try {
      const response = await api.post(
        "/ai/identify-ingredients/",
        formData,
        { timeout: 300000 }
      );

      const detected = Array.isArray(response.data?.ingredients)
        ? response.data.ingredients
        : [];

      if (!detected.length) {
        setError(
          "We couldn’t identify the ingredients clearly. Try another photo or add them manually."
        );
        return;
      }

      setIngredients(current =>
        Array.from(
          new Set(
            [...current, ...detected]
              .map(item => String(item || "").trim())
              .filter(Boolean)
          )
        )
      );
    } catch (requestError) {
      const status = requestError.response?.status;
      const detail = requestError.response?.data?.detail;

      if (status === 404) {
        setError("The ingredient scanner is not connected to the backend yet.");
      } else if (status === 401 || status === 403) {
        setError("Please sign in again before scanning your ingredients.");
      } else {
        setError(
          detail ||
          "We couldn’t scan this upload. Try a clearer photo or add the ingredients manually."
        );
      }
    } finally {
      setScanning(false);
    }
  }

  function addManualIngredient() {
    const cleanValue = draftIngredient.trim();
    if (!cleanValue) return;

    setIngredients(current =>
      current.some(item => item.toLowerCase() === cleanValue.toLowerCase())
        ? current
        : [...current, cleanValue]
    );
    setDraftIngredient("");
  }

  function saveIngredientEdit(index) {
    const cleanValue = editingValue.trim();
    if (cleanValue) {
      setIngredients(current =>
        current.map((item, itemIndex) =>
          itemIndex === index ? cleanValue : item
        )
      );
    }
    setEditingIndex(null);
    setEditingValue("");
  }

  function confirmIngredients() {
    if (!ingredients.length) {
      setError("Add or scan at least one ingredient first.");
      return;
    }
    onIngredientsConfirmed?.(ingredients);
  }

  return (
    <section className="kindli-scanner">
      <header className="kindli-scanner__header">
        <div className="kindli-scanner__icon">
          <ScanLine size={22} />
        </div>

        <div>
          <span>FOODKINDL AI KITCHEN</span>
          <h2>Show Kindli what’s in your kitchen</h2>
          <p>
            Upload a clear photo or short video of your fridge, pantry or
            ingredients. You can review every item before creating a meal.
          </p>
        </div>
      </header>

      <div
        className={`kindli-dropzone ${dragging ? "is-dragging" : ""}`}
        onDragEnter={event => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={event => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={event => {
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
      >
        <div className="kindli-dropzone__visual">
          <UploadCloud size={30} />
          <i aria-hidden="true" />
        </div>

        <strong>Drop your ingredient photos here</strong>
        <p>Use up to five clear photos or one short video.</p>

        <div className="kindli-dropzone__actions">
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus size={16} />
            Choose files
          </button>

          <button type="button" onClick={() => cameraInputRef.current?.click()}>
            <Camera size={16} />
            Take a photo
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={event => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={event => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <div className="kindli-scanner__previews">
          {files.map((item, index) => (
            <article key={`${item.file.name}-${index}`}>
              {item.isVideo ? (
                <video src={item.preview} muted playsInline />
              ) : (
                <img src={item.preview} alt={item.file.name} />
              )}

              <span>
                {item.isVideo ? <Video size={12} /> : <ImagePlus size={12} />}
                {item.file.name}
              </span>

              <button
                type="button"
                aria-label={`Remove ${item.file.name}`}
                onClick={() => removeFile(index)}
              >
                <Trash2 size={14} />
              </button>
            </article>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <button
          type="button"
          className="kindli-scanner__scan"
          onClick={scanIngredients}
          disabled={scanning}
        >
          {scanning ? <RefreshCw size={18} /> : <Sparkles size={18} />}
          {scanning ? "Kindli is identifying your ingredients…" : "Scan my ingredients"}
        </button>
      )}

      {scanning && (
        <div className="kindli-scanner__progress" aria-live="polite">
          <span />
          <p>Looking for visible vegetables, groceries and pantry items…</p>
        </div>
      )}

      {error && (
        <div className="kindli-scanner__error" role="alert">
          <Info size={16} />
          <span>{error}</span>
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            Try another photo
          </button>
        </div>
      )}

      <div className="kindli-scanner__results">
        <div className="kindli-scanner__results-head">
          <div>
            <span>REVIEW BEFORE CONTINUING</span>
            <h3>
              {ingredients.length
                ? `Kindli found ${ingredients.length} ingredient${ingredients.length === 1 ? "" : "s"}`
                : "Add ingredients manually"}
            </h3>
          </div>
          {ingredients.length > 0 && <small><Check size={13} /> Editable results</small>}
        </div>

        {ingredients.length > 0 && (
          <div className="kindli-scanner__chips">
            {ingredients.map((ingredient, index) => (
              <div className="kindli-scanner__chip" key={`${ingredient}-${index}`}>
                {editingIndex === index ? (
                  <>
                    <input
                      value={editingValue}
                      onChange={event => setEditingValue(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === "Enter") saveIngredientEdit(index);
                        if (event.key === "Escape") setEditingIndex(null);
                      }}
                      autoFocus
                    />
                    <button type="button" onClick={() => saveIngredientEdit(index)} aria-label="Save ingredient">
                      <Check size={13} />
                    </button>
                  </>
                ) : (
                  <>
                    <Check size={13} />
                    <span>{ingredient}</span>
                    <button
                      type="button"
                      aria-label={`Edit ${ingredient}`}
                      onClick={() => {
                        setEditingIndex(index);
                        setEditingValue(ingredient);
                      }}
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${ingredient}`}
                      onClick={() => setIngredients(current => current.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      <X size={12} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="kindli-scanner__manual">
          <input
            value={draftIngredient}
            onChange={event => setDraftIngredient(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter") {
                event.preventDefault();
                addManualIngredient();
              }
            }}
            placeholder="Add an ingredient Kindli missed"
          />
          <button type="button" onClick={addManualIngredient} disabled={!draftIngredient.trim()}>
            <Plus size={15} />
            Add
          </button>
        </div>
      </div>

      <button
        type="button"
        className="kindli-scanner__continue"
        disabled={!ingredients.length || scanning}
        onClick={confirmIngredients}
      >
        <Sparkles size={17} />
        Find meals I can make
      </button>
    </section>
  );
}
