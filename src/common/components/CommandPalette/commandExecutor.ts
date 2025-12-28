import { Command, CommandContext } from "./types";

export async function executeCommand(
    command: Command,
    context: CommandContext,
): Promise<void> {
    try {
        if (command.requiresForm) {
            // Show form - handler will call setCommandForm
            await command.handler(context);
        } else {
            // Execute immediately
            await command.handler(context);
            // Close palette after execution
            context.closeCommandPalette();
        }
    } catch (error) {
        console.error("Error executing command:", command.id, error);
        // In Phase 4, we'll add proper error handling with toast notifications
        throw error;
    }
}
