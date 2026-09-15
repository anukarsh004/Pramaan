import React, { useCallback, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ArrowLeft, Upload, FileUp, Check, AlertTriangle, X, ShieldCheck, FileText, FolderUp } from 'lucide-react';

const DOC_TYPES = [
  { value: 'pan_card', label: 'PAN Card' },
  { value: 'gst_certificate', label: 'GST Certificate' },
  { value: 'udyam_certificate', label: 'Udyam Certificate' },
  { value: 'mca_extract', label: 'MCA Extract / CIN' },
  { value: 'oem_authorization', label: 'OEM Authorization' },
  { value: 'experience_certificate', label: 'Experience Certificate' },
  { value: 'general', label: 'General / Other' },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

type UploadItem = {
  id: string;
  file: File;
  docType: string;
  status: 'queued' | 'uploading' | 'uploaded' | 'error';
  message?: string;
};

export function UploadPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState('pan_card');
  const [queuedFiles, setQueuedFiles] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const queueFiles = useCallback((incoming: FileList | File[]) => {
    const nextFiles = Array.from(incoming).filter((file) => {
      const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      return allowed.includes(file.type) || /\.(pdf|png|jpe?g)$/i.test(file.name);
    });

    const validFiles = nextFiles.filter((file) => file.size <= MAX_FILE_SIZE);
    const invalidFiles = nextFiles.filter((file) => file.size > MAX_FILE_SIZE);

    if (invalidFiles.length > 0) {
      const names = invalidFiles.map((file) => file.name).join(', ');
      window.alert(`${names} exceeds the 10 MB limit and was not added.`);
    }

    setQueuedFiles((prev) => [
      ...prev,
      ...validFiles.map((file) => ({
        id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
        file,
        docType: selectedType,
        status: 'queued' as const,
      })),
    ]);
  }, [selectedType]);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!applicationId || queuedFiles.length === 0) {
        throw new Error('Please choose at least one document to upload.');
      }

      setUploading(true);
      const items = queuedFiles.map((item) => ({ ...item, status: 'uploading' as const }));
      setQueuedFiles(items);

      for (const item of items) {
        try {
          await api.uploadDocument(applicationId, item.file, item.docType);
          setQueuedFiles((prev) => prev.map((queued) =>
            queued.id === item.id ? { ...queued, status: 'uploaded' } : queued,
          ));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Upload failed';
          setQueuedFiles((prev) => prev.map((queued) =>
            queued.id === item.id ? { ...queued, status: 'error', message } : queued,
          ));
        }
      }

      queryClient.invalidateQueries({ queryKey: ['case', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['bidder-app', applicationId] });
      setUploading(false);
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => api.submitApplication(applicationId!),
    onSuccess: () => navigate(`/status/${applicationId}`),
  });

  const totalBytes = useMemo(
    () => queuedFiles.reduce((sum, item) => sum + item.file.size, 0),
    [queuedFiles],
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      queueFiles(e.dataTransfer.files);
    }
  }, [queueFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      queueFiles(e.target.files);
      e.target.value = '';
    }
  };

  const removeFile = (id: string) => {
    setQueuedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-ghost btn-sm">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Upload Documents</h1>
          <p className="text-sm text-gray-500">Application: {applicationId?.slice(0, 8)}…</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="card-body space-y-5">
          <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800">
            <ShieldCheck size={16} />
            Required for eligibility review and compliance scoring.
          </div>

          <div>
            <label className="input-label">Document type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="input"
            >
              {DOC_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-7 text-center transition-all duration-200 cursor-pointer ${
              dragOver
                ? 'border-brand-500 bg-brand-50'
                : queuedFiles.length > 0
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'
            }`}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="rounded-full bg-white p-3 shadow-sm">
                <FolderUp size={28} className="text-brand-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Add files for upload</p>
                <p className="mt-1 text-xs text-gray-500">PDF, PNG, JPG — max 10 MB each</p>
              </div>
            </div>
          </div>

          {queuedFiles.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between text-sm text-gray-700">
                <span className="font-medium">Selected files</span>
                <span>{queuedFiles.length} items · {(totalBytes / 1024 / 1024).toFixed(2)} MB</span>
              </div>

              <div className="space-y-2">
                {queuedFiles.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <FileText size={16} className="text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">{item.file.name}</p>
                      <p className="text-[11px] text-gray-500">{DOC_TYPES.find((type) => type.value === item.docType)?.label ?? 'General'} · {(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status === 'uploaded' && <Check size={16} className="text-emerald-600" />}
                      {item.status === 'error' && <AlertTriangle size={16} className="text-red-500" />}
                      {item.status === 'uploading' && <span className="text-xs font-medium text-brand-600">Uploading...</span>}
                      {item.status === 'queued' && <span className="text-xs text-gray-400">Queued</span>}
                      <button onClick={() => removeFile(item.id)} className="rounded p-1 hover:bg-gray-100" aria-label={`Remove ${item.file.name}`}>
                        <X size={14} className="text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => uploadMutation.mutate()}
              disabled={uploading || queuedFiles.length === 0 || uploadMutation.isPending}
              className="btn-primary flex-1"
            >
              <Upload size={16} />
              {uploadMutation.isPending ? 'Uploading…' : 'Upload Documents'}
            </button>
            <button
              onClick={() => setQueuedFiles([])}
              className="btn-secondary"
            >
              Clear List
            </button>
          </div>
        </div>
      </div>

      <div className="card p-5 border-brand-200 bg-brand-50/30">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-brand-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">Ready to Submit?</h3>
            <p className="text-xs text-gray-600 mt-1">
              Upload all required attachments, then submit the application for officer review.
            </p>
          </div>
          <button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="btn-primary btn-sm"
          >
            {submitMutation.isPending ? 'Submitting…' : 'Submit Application'}
          </button>
        </div>
      </div>
    </div>
  );
}
