import { isRequest } from '../shared/guards';
import { createController } from './controller';
import { handleRequest } from './messages';

const controller = createController(document);
controller.start();

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isRequest(message)) return false;
  void handleRequest(controller, message).then(sendResponse);
  return true;
});
