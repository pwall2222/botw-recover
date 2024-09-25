# IDK BOTW

## Thanks

HUGE THANKS, to:

- [savage13](https://github.com/savage13/) for the nx.js based [BOTW Save editor](https://github.com/savage13/botw-save-editor) which is the backbone of this whole project (See [common.js](./common.js))
- [Marc Robledo](https://github.com/marcrobledo) for his [BOTW Web Editor](https://www.marcrobledo.com/savegame-editors/zelda-botw/)
- [Zelda Mods](https://zeldamods.org) for hosting the wonderful wiki where I could see important details like [SaveFiles](https://zeldamods.org/wiki/Save_Files) and helped me discover [the pseudo-source](https://github.com/leoetlino/botw/)

For making this project even possible

## Requisites

- NodeJS
- Just

## Ussage

(This project is meant for a "unix"/linux enviroment I can't garantee it will work on windows)

```sh
just sav Saves/
```

Will get you a CSV of `time, formated_time, rupees, map_unit, filename` of any `game_data.sav` that exists on the provided path (in this case `Saves/`)

```sh
just cap Saves/
```

Will get you a CSV of `timestamp, date, location, filename` of any `caption.sav` that exists on the provided path (in this case `Saves/`)

In either case it will not look for the exact name but rather for file size.

## Recovering saves

If you lost your saves and you somehow think there is a chance to recovering it you can use my `photorec.sig` and the program [Photorec](https://www.cgsecurity.org/wiki/PhotoRec) to recover your saves.
I do warn this will spew files of all sizes (larger than they should), so if you want an easy time you can just grab all your recovered files that look like `f<numbers>.sav`
And use:

```sh
just trim-cap recovered/ trimmed-cap/
```

```sh
just trim-sav recovered/ trimmed-sav/
```

To trim the file and then use the earlier commands to analize the contents of the mismash of files.

If you feel so very inspired you can use Hekate and NxNandManager to dump your whole nand/emmc, decrypt it and then pass that through photorec.

## Warning

I will make no further changes to this project and it's only a resource for anyone that want's to check it out, and is as crazy as me.
