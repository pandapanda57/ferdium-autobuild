// Replacement for Ferdium's src/electron/ipc-api/clipboard.ts on Electron 44+.
// Electron 44 removed clipboard.writeImage() and made the clipboard API Promise-based
// (W3C Clipboard API); images are now written as an image/png ClipboardItem.
import { ClipboardItem, clipboard, ipcMain, nativeImage } from 'electron';

export default () => {
  ipcMain.handle('clipboard-write-text', async (_event, text: unknown) => {
    if (typeof text !== 'string') {
      return false;
    }

    await clipboard.writeText(text);
    return true;
  });

  ipcMain.handle(
    'clipboard-write-image-data-url',
    async (_event, dataURL: unknown) => {
      if (typeof dataURL !== 'string') {
        return false;
      }

      const png = nativeImage.createFromDataURL(dataURL).toPNG();
      await clipboard.write([
        new ClipboardItem({
          'image/png': new Blob([png], { type: 'image/png' }),
        }),
      ]);
      return true;
    },
  );
};
