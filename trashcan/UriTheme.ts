import { Theme } from "./theme";

// TODO: GitHubなどのリポジトリ指定に対応

/**
 * http/httpsでcssファイルを指定したテーマ
 */
export class UriTheme extends Theme {
    type: 'uri' = 'uri';

    /**
     *
     * @param name
     * @param location
     */
    public constructor(name: string, location: string) {
        super(name, location);
    }

    /**
     *
     * @param from
     * @return uri string
     */
    public locateThemePath(from: string): string[] {
        return [this.location];
    }

    /**
     * nothing to do
     */
    public copyTheme() {
        // nothing to do
    }

    /**
     * create URITheme instance from URI
     * @param locator
     */
    public static parse(locator: string): UriTheme | undefined {
        if (this.isURL(locator)) {
            const theme: UriTheme = new UriTheme(path.basename(locator), locator);
            return theme;
        }
    }
}
