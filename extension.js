import Clutter from 'gi://Clutter';
import Graphene from 'gi://Graphene';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import St from 'gi://St';

import {Extension, InjectionManager} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Background from 'resource:///org/gnome/shell/ui/background.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {MonitorGroup, WorkspaceBackground} from 'resource:///org/gnome/shell/ui/workspaceAnimation.js';

// Effect sizes at full strength, at the middle of the slide.
const DIM_OPACITY = 0.6; // share of black laid over the wallpaper
const BLUR_RADIUS = 40; // logical pixels
const ZOOM = 0.1; // extra scale
const DRIFT = 0.06; // share of the monitor the wallpaper travels

/*
 * During a workspace switch GNOME covers each monitor with a MonitorGroup,
 * which slides one picture per workspace, and each picture carries its own
 * copy of the wallpaper. The pictures are kept (other extensions, such as
 * Liquid Glass, add their desktop items to them), but they are drawn without
 * a wallpaper; a single still wallpaper is put beneath them instead.
 */
class StillLayer {
    constructor(group, effect, strength) {
        const monitor = group._monitor;

        this._group = group;
        this._effect = effect;
        this._strength = strength;
        this._size = global.workspace_manager.layout_rows === -1
            ? monitor.height : monitor.width;

        this._actor = new Clutter.Actor({
            width: monitor.width,
            height: monitor.height,
            pivot_point: new Graphene.Point({x: 0.5, y: 0.5}),
        });

        const background = new Meta.BackgroundGroup();
        this._actor.add_child(background);
        this._bgManager = new Background.BackgroundManager({
            container: background,
            monitorIndex: monitor.index,
            controlPosition: false,
        });

        if (effect === 'dim') {
            this._shade = new St.Widget({
                width: monitor.width,
                height: monitor.height,
                style: 'background-color: black;',
                opacity: 0,
            });
            this._actor.add_child(this._shade);
        } else if (effect === 'blur') {
            this._blur = new Shell.BlurEffect({mode: Shell.BlurMode.ACTOR, radius: 0});
            this._blur.enabled = false;
            this._actor.add_effect(this._blur);
        }

        group.insert_child_below(this._actor, null);
        this._actor.connect('destroy', () => this._bgManager.destroy());

        if (effect !== 'none') {
            this._start = group.progress;
            group.connectObject('notify::progress', () => this._update(), this._actor);
        }
    }

    // How far into the current workspace-to-workspace step the slide is, as
    // 0 at either workspace and 1 halfway between, eased like a sine.
    _amount(progress) {
        const points = this._group.getSnapPoints();
        for (let i = 1; i < points.length; i++) {
            const [lo, hi] = [points[i - 1], points[i]];
            if (progress >= lo && progress <= hi && hi > lo)
                return Math.sin(Math.PI * (progress - lo) / (hi - lo));
        }
        return 0;
    }

    _update() {
        const progress = this._group.progress;
        const t = this._amount(progress) * this._strength;
        const actor = this._actor;

        switch (this._effect) {
        case 'dim':
            this._shade.opacity = Math.round(255 * DIM_OPACITY * t);
            break;

        case 'blur': {
            const scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;
            const radius = BLUR_RADIUS * scale * t;
            this._blur.radius = radius;
            this._blur.enabled = radius > 0.5;
            // Blurring softens the edges into transparency; grow just enough
            // to keep them outside the monitor.
            const grow = 1 + (2 * radius) / Math.min(actor.width, actor.height);
            actor.set_scale(grow, grow);
            break;
        }

        case 'zoom':
            actor.set_scale(1 + ZOOM * t, 1 + ZOOM * t);
            break;

        case 'drift': {
            // Travel the way the windows do, and grow just enough that the
            // edges never come into view.
            const shift = DRIFT * this._size * t;
            const scale = t > 1e-6 ? 1 + (2 * shift + 2) / this._size : 1;
            // Windows move against rising progress, except in right-to-left
            // horizontal layouts, where they move with it.
            const vertical = global.workspace_manager.layout_rows === -1;
            const rtl = this._group.get_text_direction() === Clutter.TextDirection.RTL;
            const towards = Math.sign(progress - this._start) * (!vertical && rtl ? 1 : -1);
            actor.set_scale(scale, scale);
            if (vertical)
                actor.translation_y = towards * shift;
            else
                actor.translation_x = towards * shift;
            break;
        }
        }
    }
}

export default class StillWallpaperExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._injections = new InjectionManager();

        // The per-workspace pictures keep their desktop icons, but lose the
        // wallpaper. _onDestroy still calls _bgManager.destroy().
        this._injections.overrideMethod(WorkspaceBackground.prototype, '_createBackground',
            () => function () {
                this._bgManager = {destroy() {}};
            });

        Main.layoutManager.uiGroup.connectObject('child-added', (_parent, actor) => {
            if (actor instanceof MonitorGroup) {
                new StillLayer(actor,
                    this._settings.get_string('effect'),
                    this._settings.get_double('strength'));
            }
        }, this);
    }

    disable() {
        Main.layoutManager.uiGroup.disconnectObject(this);
        this._injections.clear();
        this._injections = null;
        this._settings = null;
    }
}
