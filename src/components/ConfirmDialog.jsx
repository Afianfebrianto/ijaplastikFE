import { DotLottieReact } from '@lottiefiles/dotlottie-react'

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <DotLottieReact
            src="https://lottie.host/6d7e1c48-f08d-46e9-9d2f-24ea734d1c86/2Cxcn64TLg.lottie" 
            autoplay
            loop={false}
            style={{ width: 120, height: 120 }}
          />
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-gray-600 text-sm">{message}</p>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded bg-gray-100 hover:bg-gray-200"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
          >
            Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  )
}
