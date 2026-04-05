import React from 'react';
import {
  File,
  FileText,
  FileSpreadsheet,
  FileVideo2,
  FileAudio,
  FileArchive,
} from 'lucide-react';
import { getFileCategory, getFileExtension } from '@/communication/chatV2/fileCategories';

interface FileTypeIconProps {
  mimeType: string;
  filename: string;
  size?: number;
  className?: string;
}

export function FileTypeIcon({ mimeType, filename, size = 20, className }: FileTypeIconProps) {
  const category = getFileCategory(mimeType);
  const iconProps = { size, className };

  switch (category) {
    case 'video':
      return <FileVideo2 {...iconProps} />;
    case 'audio':
      return <FileAudio {...iconProps} />;
    case 'archive':
      return <FileArchive {...iconProps} />;
    case 'document': {
      const ext = getFileExtension(filename);
      if (ext === 'csv' || ext === 'xlsx')
        return <FileSpreadsheet {...iconProps} />;
      return <FileText {...iconProps} />;
    }
    default:
      return <File {...iconProps} />;
  }
}
