import type { NavigateResponse, PathResponse, Request } from '../shared/types';
import type { Controller } from './controller';

export const handleRequest = async (
  controller: Pick<Controller, 'getPath' | 'navigate'>,
  request: Request,
): Promise<PathResponse | NavigateResponse> => {
  switch (request.type) {
    case 'dfp:getPath':
      return controller.getPath();
    case 'dfp:navigate':
      try {
        await controller.navigate(request.id);
        return { ok: true };
      } catch (error) {
        console.warn('[Full Path for Google Drive]', 'navigation failed', error);
        return { ok: false };
      }
  }
};
