# Updating equipment and publishing

You no longer need to download or copy Foundry equipment files yourself.
Run these commands in a terminal opened in this project's folder.

## Normal update: new equipment to published website

1. Save/commit any other work first so the equipment changes are easy to review.
2. Run `npm run update:pf2e`.
   This finds the newest stable **PF2e system** release, downloads its equipment
   and material definitions, rebuilds our small database, runs tests, and builds
   the website. It excludes beta releases, Starfinder, and companion modules.
3. Read the final report of added, removed, and changed items. A new release can
   remove or rename things as well as add them. If the command fails, stop:
   it restores the old source databases and upstream pointer. Do not deploy.
4. Run `npm run dev`, open the local address it prints, and try a few changed items.
5. Commit the changes and push your project as usual. Include the `upstream/pf2e`
   entry: that is just a version pointer, not thousands of equipment files.
   Also include the generated data and `data/pf2e-version.json`.
6. Run `npm run deploy`. Wait for **Published**. GitHub Pages may take a little
   time to show the new build; refresh/reopen the website afterward.

Updating does not commit, push, or publish automatically. Deploy publishes the
website branch; it does not push your source commits on main.

## First time on another computer (or after pulling a changed upstream pointer)

Run `npm install`, then `npm run setup:pf2e`.
Setup retrieves the exact PF2e version recorded by this project, not the newest
release. Run `npm run update:pf2e` when you deliberately want a newer release.
Ordinary website builds use the committed compact data and do not need upstream.

## Other useful commands

- `npm run import:pf2e`: rebuild and validate data from the currently checked-out
  PF2e version, without looking for a newer release.
- `npm test`: run the app's tests.
- `data/pf2e-version.json`: shows the imported release and exact revision.

The upstream repository is https://github.com/foundryvtt/pf2e. It is stored as a
Git submodule in `upstream/pf2e`. Sparse checkout keeps equipment and the material
source directory (plus Git's normal parent/root files) locally. Do not edit that
folder. Your old ignored `src/packs/` folder is left alone but is no longer used.

The generated compact databases and material-table snapshot remain committed.
They are build outputs, not a manually maintained equipment copy. The website
never downloads equipment from GitHub at runtime. Custom magic presets are our
separate reference table and are not rewritten by this updater.

If upstream changes its file format, the importer may need an adjustment. A failed
update should be investigated rather than bypassing the tests.
