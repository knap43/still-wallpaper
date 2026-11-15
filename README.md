# Still Wallpaper

A GNOME Shell extension (GNOME 49–51) that keeps the wallpaper still while you
switch workspaces. Only the windows slide, gliding across a background that
stays put. This works for keyboard shortcuts and touchpad swipes alike,
including half-finished swipes.

An optional effect can accompany the slide:

| Effect | What the wallpaper does |
| ------ | ----------------------- |
| None   | Stays perfectly still (default) |
| Dim    | Darkens |
| Blur   | Softens into a blur |
| Zoom   | Leans in slightly |
| Drift  | Travels a little way along with the windows, for a sense of depth |

Each effect peaks halfway through the slide and fades out as it settles, so
the wallpaper always ends exactly as it began.

Desktop icons and Liquid Glass desktop items still move with their workspace,
because they belong to it.

## Install

```sh
git clone https://github.com/knap43/still-wallpaper.git
cd still-wallpaper
glib-compile-schemas schemas/
ln -s "$PWD" ~/.local/share/gnome-shell/extensions/still-wallpaper@knap43.github.io
```

Log out and back in (Wayland), then:

```sh
gnome-extensions enable still-wallpaper@knap43.github.io
```

## Settings

```sh
gnome-extensions prefs still-wallpaper@knap43.github.io
```

Choose an effect and its strength (0.05–1). Changes take effect on the next
switch.

## How it works

During a switch, GNOME lays one picture of each workspace on every monitor and
slides them; each picture normally carries its own copy of the wallpaper. The
extension draws those pictures without a wallpaper and places a single still
wallpaper beneath them. The pictures themselves are left in place, so other
extensions that decorate them keep working.
