
import ofEvents from '../of_events';
import { Identity, OpenFinWindow, EventPayload } from '../../shapes';
import route from '../../common/route';
import * as  coreState from '../core_state';
import * as Shapes from '../../shapes';

export class FrameInfo implements Shapes.FrameInfo {
    public uuid: string = '';
    public name?: string = '';
    public parent: Identity = {uuid: null, name: null};
    public entityType: Shapes.EntityType = Shapes.EntityType.UNKNOWN;

    constructor(frameInfo: Shapes.FrameInfo = <Shapes.FrameInfo>{}) {
        const {uuid, name, parent, entityType} = frameInfo;
        this.name = name || this.name;
        this.uuid = uuid || this.uuid;
        this.parent = parent || this.parent;
        this.entityType = entityType || this.entityType;
    }
}

export module Frame {
    export function addEventListener (targetIdentity: Identity, type: string, listener: (eventPayload: EventPayload) => void) {
        const eventString = route.frame(type, targetIdentity.uuid, targetIdentity.name);
        const errRegex = /^Attempting to call a function in a renderer frame that has been closed or released/;
        let unsubscribe;
        let browserWinIsDead;

        const safeListener = (...args: any[]) => {
            try {
                listener.call(null, ...args);
            } catch (err) {
                browserWinIsDead = errRegex.test(err.message);

                if (browserWinIsDead) {
                    ofEvents.removeListener(eventString, safeListener);
                }
            }
        };

        ofEvents.on(eventString, safeListener);

        unsubscribe = () => {
            ofEvents.removeListener(eventString, safeListener);
        };
        return unsubscribe;
    }

    export function removeEventListener(identity: Identity, type: string, listener: Shapes.Listener) {
        const browserFrame = <OpenFinWindow>coreState.getWindowByUuidName(identity.uuid, identity.name);
        if (browserFrame) {
            const id = String(browserFrame.id);
            ofEvents.removeListener(route.frame(type, id), listener);
        }
    }

    export function getInfo (targetIdentity: Identity) {
        const frameInfo = coreState.getInfoByUuidFrame(targetIdentity);

        if (frameInfo) {
            return new FrameInfo(frameInfo);
        } else {
            return new FrameInfo(<FrameInfo>targetIdentity);
        }
    }

    export function getParentWindow(identity: Shapes.Identity) {
        const app: Shapes.App = coreState.getAppByUuid(identity.uuid);
        const parentWindow: Shapes.Window = app.children.find((win: Shapes.Window) => {
            const ofWin = win.openfinWindow;
            const frames = ofWin && ofWin.frames;
            const hasFrame = frames && frames.get(identity.name);

            return !!hasFrame;
        });

        if (!parentWindow || !parentWindow.openfinWindow) {
            return new FrameInfo();
        }

        const { uuid, name } = parentWindow.openfinWindow;
        return getInfo({ uuid, name });
    }
}
