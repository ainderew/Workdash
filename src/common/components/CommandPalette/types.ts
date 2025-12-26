import { LucideIcon } from 'lucide-react';

export interface Command {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  keywords: string[];
  category?: string;
  requiresForm: boolean;
  formComponent?: React.ComponentType<CommandFormProps>;
  handler: CommandHandler;
}

export type CommandHandler = (context: CommandContext) => void | Promise<void>;

export interface CommandContext {
  closeCommandPalette: () => void;
  setCommandForm: (formType: string | null) => void;
}

export interface CommandFormProps {
  onClose: () => void;
}
