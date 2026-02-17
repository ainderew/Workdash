# Packet Handoff: desk-39-v2-hard-cut

## Packet ID
- `desk-39-v2-hard-cut`

## Scope
Hard cut frontend runtime to chat-v2 path and remove legacy 2D chat runtime dependencies.

## Files Changed
- `/Users/AndrewPinon/projects/workdash/src/App.tsx`
- `/Users/AndrewPinon/projects/workdash/src/communication/mediaTransportService/mediaTransportServive.ts`
- `/Users/AndrewPinon/projects/workdash/src/common/utils/linkMetadata.ts`
- Deleted:
  - `/Users/AndrewPinon/projects/workdash/src/common/components/TextChat/ChatWindow.tsx`
  - `/Users/AndrewPinon/projects/workdash/src/common/components/TextChat/MessageItem.tsx`
  - `/Users/AndrewPinon/projects/workdash/src/common/components/TextChat/GiphyPicker.tsx`
  - `/Users/AndrewPinon/projects/workdash/src/communication/textChat/textChat.ts`
  - `/Users/AndrewPinon/projects/workdash/src/communication/textChat/_types.ts`
  - `/Users/AndrewPinon/projects/workdash/src/communication/textChat/_enums.ts`
  - `/Users/AndrewPinon/projects/workdash/src/common/store/messagingStore.ts`

## Implementation Notes
- Removed legacy `TextChatService` initialization from `App.tsx` runtime init flow.
- Updated socket auth payload to include `chatProtocolVersion: 2` in media transport connection setup.
- Removed legacy chat runtime components/store/service now unused after drawer cutover.
- Moved `LinkMetadata` type into `linkMetadata` utility to avoid dependency on removed legacy chat types.

## Validation
- `npm run lint` passed.

## Exit Criteria Status
- [x] No frontend runtime usage of `sendMessage/newMessage` legacy chat path.
- [x] Chat UI interactions in both modes run through chat-v2 shell/store.
