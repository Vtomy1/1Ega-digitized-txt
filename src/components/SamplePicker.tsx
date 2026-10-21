import React, { useRef } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';

interface SampleItem {
  id: string;
  title: string;
  subtitle: string;
  path: string;
}

const SAMPLES: SampleItem[] = [
  {
    id: 'knight',
    title: 'Pixel Knight',
    subtitle: 'Dungeon & Torchlight',
    path: '/src/assets/images/retro_game_knight_1792552341073.jpg',
  },
  {
    id: 'sunset',
    title: 'Cyber Grid Sunset',
    subtitle: '90s DOS Horizon',
    path: '/src/assets/images/dos_synth_sunset_1792552342277.jpg',
  },
  {
    id: 'rover',
    title: 'Space Rover',
    subtitle: 'Lunar Expedition',
    path: '/src/assets/images/space_rover_dos_1792552341897.jpg',
  },
];

interface SamplePickerProps {
  selectedSampleId: string | null;
  onSelectSample: (path: string, id: string) => void;
  onFileUpload: (file: File) => void;
}

export function SamplePicker({
  selectedSampleId,
  onSelectSample,
  onFileUpload,
}: SamplePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-neutral-200">Source Image</h3>
        </div>
        <span className="text-xs text-neutral-500">Pick sample or drop any file</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
        {SAMPLES.map((sample) => {
          const isSelected = selectedSampleId === sample.id;
          return (
            <button
              key={sample.id}
              onClick={() => onSelectSample(sample.path, sample.id)}
              className={`relative text-left group overflow-hidden rounded-md border p-1.5 transition-all flex sm:flex-col items-center sm:items-start gap-2.5 ${
                isSelected
                  ? 'border-amber-400 bg-amber-950/20 shadow-sm'
                  : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700 hover:bg-neutral-950'
              }`}
            >
              <div className="w-14 h-14 sm:w-full sm:h-20 rounded bg-neutral-900 overflow-hidden shrink-0 relative">
                <img
                  src={sample.path}
                  alt={sample.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
              <div className="min-w-0 pr-1">
                <div className="text-xs font-medium text-neutral-200 truncate">
                  {sample.title}
                </div>
                <div className="text-[11px] text-neutral-500 truncate">
                  {sample.subtitle}
                </div>
              </div>
            </button>
          );
        })}

        {/* Upload or Drop tile */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-neutral-700 hover:border-amber-400/80 bg-neutral-950/40 hover:bg-neutral-950 rounded-md p-2 flex sm:flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center group min-h-[58px] sm:min-h-[110px]"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-400 group-hover:text-amber-400 group-hover:bg-amber-950/30 transition-colors">
            <Upload className="w-4 h-4" />
          </div>
          <div className="text-left sm:text-center">
            <div className="text-xs font-medium text-neutral-300 group-hover:text-amber-300">
              Upload Custom Image
            </div>
            <div className="text-[10px] text-neutral-500">
              PNG, JPG, WebP, GIF
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
