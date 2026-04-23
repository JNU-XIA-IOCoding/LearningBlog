# Phoenix Blog Project Bible

## Core Rule
The visual presentation in [existing/frontend/index.html](E:\Chrome-Downloading\files\phoenix-blog-claude-code\phoenix-codepack\existing\frontend\index.html) is the only front-end bible for this project.

Code may be refactored. Data may be moved to backend and database. Deployment may be upgraded.
The final look, atmosphere, interaction rhythm, typography direction, and section composition must not drift away from that source.

## Non-Negotiables
1. Do not replace the Sakura / cream / petal / bark visual language.
2. Do not redesign the page into a different layout system.
3. Do not treat backend work as permission to rewrite the front-end style.
4. Do not compress or blur wallpaper assets from `E:\壁纸\意涵`.
5. Keep the dynamic background overlay target at `0.4`.
6. Preserve the learning modules, AI resources, journal system, roadmap, and original navigation intent.
7. Admin exists to configure, persist, and operate data. It does not define the public visual identity.

## Product Direction
This is not only a personal blog. It is the web foundation of XIA Guoqing's long-term learning platform and future app ecosystem.

The website must stay:
- personally expressive
- commercially complete
- full-stack and database-backed
- shareable through public links and future custom domain deployment
- mobile-usable

## Background Media Rules
1. Source folder: `E:\壁纸\意涵`
2. Use original files directly whenever possible.
3. Video backgrounds can be added to multiple sections, not only hero.
4. Background playback should feel continuous and natural, never like a broken or heavily sliced montage.
5. Backend wallpaper selection must persist across restart.
6. Default public media comes from `E:\壁纸\意涵`; backend uploaded media only takes over after admin selection is saved.
7. Each major page/section should start from a different video when videos exist.
8. A video must play to completion before that section randomly chooses the next media item.
9. Images may be embedded into the playlist, but they must not displace the first video when video assets exist.

## Backend Rules
1. Site settings must write to database and be read back by the front-end.
2. Wallpaper selections must write to database and survive restart.
3. Admin panel should be Chinese-first and actually operable.
4. Uploaded media should be available for selection without breaking the public site.

## Deployment Rules
1. Local startup must be recoverable with one command.
2. Public sharing must have a free working path.
3. Domain instability is a bug, not an acceptable state.
4. The local stack should be kept light enough for roughly 100 concurrent readers by using cached static media, no media transcoding, backend pooling, and minimal blocking work in request handlers.

## Working Standard
When making changes, validate in this order:
1. Did the public page still match the bible?
2. Did the user’s original feature intent stay intact?
3. Did the backend/database connection really work?
4. Did startup and sharing still recover cleanly?
