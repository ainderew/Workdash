import { Command, CommandContext } from "./types";

export async function executeCommand(
    command: Command,
    context: CommandContext,
): Promise<void> {
    try {
        if (command.requiresForm) {
            await command.handler(context);
        } else {
            await command.handler(context);
            context.closeCommandPalette();
        }
    } catch (error) {
        console.error("Error executing command:", command.id, error);
        throw error;
    }
}
