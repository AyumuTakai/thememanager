import { Theme } from "./theme";

/**
 * Package Theme (npm package,local package)
 */
export class PackageTheme extends Theme {
    type: 'package' = 'package';
    destination: string;
    styles: string[];

    /**
     * Constructor
     * @param name
     * @param location
     * @param destination
     * @param style
     */
    public constructor(
        name: string,
        location: string,
        destination: string,
        style: string | string[],
    ) {
        super(name, location);
        this.destination = destination;
        this.styles = Array.isArray(style) ? style : [style];
    }

    /**
     * parse locator
     * @param locator
     * @param contextDir
     * @param workspaceDir
     * @private
     */
    public static parse(
        locator: string,
        contextDir: string,
        workspaceDir: string,
        vars: Object | undefined = undefined,
    ): PackageTheme | undefined {
        if (!locator) return;
        const pkgRootDir = resolvePkg(locator, { cwd: contextDir });
        if (!pkgRootDir?.endsWith('.css')) {
            const location = pkgRootDir ?? path.resolve(contextDir, locator);
            const style = PackageTheme.parseStyleLocator(location, locator);
            if (style) {
                const destination = path.join(
                    workspaceDir,
                    'themes/packages',
                    style.name,
                );
                const theme = new PackageTheme(
                    style.name,
                    location,
                    destination,
                    style.maybeStyle,
                );
                return theme;
            }
        }
    }

    /**
     *
     * @param from
     */
    public locateThemePath(from: string): string[] {
        return this.styles.map((sty) => {
            if (sty.endsWith('.scss')) {
                sty = sty.replace(/.scss$/, '.css');
            }
            return path.relative(from, path.join(this.destination, sty));
        });
    }

    /**
     * copy theme package to workspace
     */
    public copyTheme() {
        shelljs.mkdir('-p', this.destination);
        shelljs.cp('-r', path.join(this.location, '*'), this.destination);
        if (this.entries.length == 0) {
            //TODO テストに通すための処理なので整理する
            this.styles = this.styles.map((sty) => {
                return sty;
            });
            return;
        }
        for (const entry of this.entries) {
            if (entry.vars && Object.keys(entry.vars).length > 0) {
                // このテーマをクローンしてエントリ用のテーマオブジェクトを作る
                const entryTheme = new PackageTheme(
                    this.name,
                    this.location,
                    this.destination,
                    this.styles,
                );
                // エントリの参照しているこのテーマをエントリ用のテーマに置き換える
                entry.theme = [...entry.theme];
                const index = entry.theme.findIndex((obj) => obj === this);
                //console.log(themeList === entry.theme);
                entry.theme.splice(index, 1, entryTheme);

                entryTheme.entries = [entry];
                entryTheme.styles = this.styles.map((sty) => {
                    return sty;
                });
            } else {
                this.styles = this.styles.map((sty) => {
                    return sty;
                });
            }
        }
        //    console.log(this.entries[0].theme === this.entries[1].theme);
    }

    /**
     *
     * @param packageJson
     * @private
     */
    private static parseScriptsLocator(packageJson: any): string | undefined {
        const scripts = packageJson?.vivliostyle?.theme?.scripts ?? undefined;
        return scripts;
    }

    /**
     * parse style locator
     * 1. specified in the theme field of the vivliostyle.config.js
     * 2. specified in the style field of the package.json
     * 3. specified in the main field of the package.json
     * If more than one type is specified, the order of priority is 1 > 2 > 3
     * @param pkgRootDir
     * @param locator
     * @throws Error if invalid style file
     */
    static parseStyleLocator(
        pkgRootDir: string,
        locator: string,
    ): ParsedStyle | undefined {
        const pkgJsonPath = path.join(pkgRootDir, 'package.json');
        if (!fs.existsSync(pkgJsonPath)) {
            return undefined;
        }

        const packageJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

        const maybeStyle =
            packageJson?.vivliostyle?.theme?.style ??
            packageJson.style ??
            packageJson.main;

        if (!maybeStyle) {
            throw new Error(
                `invalid style file: ${maybeStyle} while parsing ${locator}`,
            );
        }

        const scripts = PackageTheme.parseScriptsLocator(packageJson);

        return { name: packageJson.name, maybeStyle, scripts };
    }
}
