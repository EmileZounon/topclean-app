import { useRef, useState } from 'react'

export default function PhotoUpload({ onPhoto, required = false, label = 'Photo' }) {
  const inputRef = useRef()
  const [preview, setPreview] = useState(null)

  function handleChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result)
    reader.readAsDataURL(file)

    file.arrayBuffer().then((buf) => {
      onPhoto(new Blob([buf], { type: file.type }))
    })
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {preview ? (
        <div className="relative">
          <img src={preview} alt="Apercu" className="w-full h-48 object-cover rounded-lg" />
          <button
            type="button"
            onClick={() => { setPreview(null); onPhoto(null); inputRef.current.value = '' }}
            className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm"
          >
            X
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current.click()}
          className="w-full py-8 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 hover:border-primary hover:text-primary transition-colors flex flex-col items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
            <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
            <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3H4.5a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zm12-2.625a.75.75 0 10-1.5 0 .75.75 0 001.5 0z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">Prendre une photo</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
        required={required && !preview}
      />
    </div>
  )
}
