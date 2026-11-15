import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const EFFECTS = [
    ['none', 'None'],
    ['dim', 'Dim'],
    ['blur', 'Blur'],
    ['zoom', 'Zoom'],
    ['drift', 'Drift'],
];

export default class StillWallpaperPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup({
            title: 'Effect',
            description: 'What the wallpaper does while windows slide over it. ' +
                'Every effect peaks halfway and fades out as the slide settles.',
        });

        const effect = new Adw.ComboRow({
            title: 'Effect',
            model: Gtk.StringList.new(EFFECTS.map(([, label]) => label)),
        });
        const sync = () => {
            const index = EFFECTS.findIndex(([id]) => id === settings.get_string('effect'));
            effect.selected = Math.max(index, 0);
        };
        sync();
        settings.connect('changed::effect', sync);
        effect.connect('notify::selected', () =>
            settings.set_string('effect', EFFECTS[effect.selected][0]));

        const strength = Adw.SpinRow.new_with_range(0.05, 1, 0.05);
        strength.title = 'Strength';
        strength.subtitle = 'How pronounced the effect is at its peak';
        strength.digits = 2;
        settings.bind('strength', strength, 'value', Gio.SettingsBindFlags.DEFAULT);
        const syncStrength = () => {
            strength.sensitive = settings.get_string('effect') !== 'none';
        };
        syncStrength();
        settings.connect('changed::effect', syncStrength);

        group.add(effect);
        group.add(strength);
        page.add(group);
        window.add(page);
    }
}
