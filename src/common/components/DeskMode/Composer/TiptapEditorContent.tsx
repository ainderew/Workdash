import React from 'react';
import { EditorContent, type Editor } from '@tiptap/react';
import { Code2 } from 'lucide-react';

interface TiptapEditorContentProps {
  editor: Editor | null;
  inputElementId?: string;
}

function TiptapEditorContent({ editor, inputElementId }: TiptapEditorContentProps) {
  const hasCodeBlock = editor?.isActive('codeBlock') ?? false;

  return (
    <div className="min-w-0 flex flex-1 flex-col">
      {hasCodeBlock && (
        <div className="flex items-center gap-1 px-3 pt-2 pb-0">
          <Code2 size={13} className="wd-text-muted shrink-0" />
          <span className="text-[11px] wd-text-muted tracking-wide uppercase">Code block</span>
        </div>
      )}
      <EditorContent
        editor={editor}
        id={inputElementId}
        className="min-h-[36px] text-sm max-h-[240px] w-full overflow-y-auto px-3 py-2 leading-5 wd-text-primary"
      />
    </div>
  );
}

export default TiptapEditorContent;
