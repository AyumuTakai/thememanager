import { Theme } from "./theme";

/**
 * ローカルファイルのcssを指定したテーマ
 */
 export class FileTheme extends Theme {
    type: 'file' = 'file';
    destination: string;
  
    /**
     *
     * @param name
     * @param location
     * @param destination
     */
    public constructor(name: string, location: string, destination: string) {
      super(name, location);
      this.destination = destination;
    }
  
    /**
     * ThemePath(relative path)
     * @param from
     */
    public locateThemePath(from: string): string[] {
      const themePath = path.relative(from, this.destination);
      return [themePath];
    }
  
    /**
     * copy theme file to workspace
     */
    public copyTheme(): void {
      if (this.location !== this.destination) {
        shelljs.mkdir('-p', path.dirname(this.destination));
        if (this.location.endsWith('.scss')) {
          this.destination = this.destination.replace(/.scss$/, '.css');
          const css = Theme.transpileSass(this.location);
          fs.writeFileSync(this.destination, css);
        } else {
          shelljs.cp(this.location, this.destination);
        }
      }
    }
  
    /**
     * parse locator
     * @param locator
     * @param contextDir
     * @param workspaceDir
     */
    public static parse(
      locator: string,
      contextDir: string,
      workspaceDir: string,
      vars: Object | undefined = undefined,
    ): FileTheme | undefined {
      const name = path.basename(locator);
      const stylePath = path.resolve(contextDir, locator);
      const sourceRelPath = path.relative(contextDir, stylePath);
      const destinationPath = path.resolve(workspaceDir, sourceRelPath);
      const theme = new FileTheme(name, stylePath, destinationPath);
      return theme;
    }
  }
  