export class WindowOpener {
  protected dialog: HTMLDivElement;

  protected url: URL | string | null = null;
  protected target: string | null = null;
  protected features: string | null = null;

  constructor() {
    this.dialog = this.initDialog();

    window.document.body.appendChild(this.dialog);
    window.document.addEventListener("click", (ev: MouseEvent) => {
      if (!(ev.target as HTMLElement).closest(`#${this.dialog.id}`)) {
        this.hideDialog();
      }
    });
  }

  protected initDialog(): HTMLDivElement {
    const dialog = window.document.createElement("div");
    dialog.id = "unwallet-provider--window-opener";
    dialog.style.backgroundColor = `#fff`;
    dialog.style.borderRadius = `8px`;
    dialog.style.boxShadow = `0 11px 15px -7px rgb(0 0 0 / 20%), 0 24px 38px 3px rgb(0 0 0 / 14%), 0 9px 46px 8px rgb(0 0 0 / 12%)`;
    dialog.style.display = `none`;
    dialog.style.fontFamily = `Roboto, "Helvetica Neue", sans-serif`;
    dialog.style.height = `72px`;
    dialog.style.position = `absolute`;
    dialog.style.right = `16px`;
    dialog.style.top = `16px`;
    dialog.style.zIndex = `2147483647`;

    const logo = window.document.createElement("div");
    logo.style.display = `flex`;
    logo.style.flexDirection = `column`;
    logo.style.height = `100%`;
    logo.style.justifyContent = `center`;
    logo.style.padding = `0 16px`;
    const logoImage = window.document.createElement("img");
    logoImage.src = "https://cdn.unwallet.world/assets/img/icon.png";
    logoImage.style.height = `40px`;
    logo.appendChild(logoImage);
    dialog.appendChild(logo);

    const body = window.document.createElement("div");
    body.style.display = `flex`;
    body.style.flexDirection = `column`;
    body.style.height = `100%`;
    body.style.justifyContent = `center`;
    body.style.padding = `0 16px 0 0`;
    const title = window.document.createElement("span");
    title.innerText = "認証が必要です";
    title.style.fontSize = `14px`;
    title.style.fontWeight = `bold`;
    title.style.lineHeight = `14px`;
    body.appendChild(title);
    const description1 = window.document.createElement("span");
    description1.innerText = "右の「続行」ボタンを押して、unWallet";
    description1.style.fontSize = `12px`;
    description1.style.lineHeight = `12px`;
    description1.style.margin = `8px 0 0`;
    body.appendChild(description1);
    const description2 = window.document.createElement("span");
    description2.innerText = "による認証を続行してください。";
    description2.style.fontSize = `12px`;
    description2.style.lineHeight = `12px`;
    description2.style.margin = `4px 0 0`;
    body.appendChild(description2);
    dialog.appendChild(body);

    const action = window.document.createElement("div");
    action.style.borderLeft = `1px solid #eee`;
    action.style.color = `#0093a5`;
    action.style.cursor = `pointer`;
    action.style.display = `flex`;
    action.style.flexDirection = `column`;
    action.style.height = `100%`;
    action.style.justifyContent = `center`;
    action.style.padding = `0 16px`;
    const actionText = window.document.createElement("span");
    actionText.innerText = "続行";
    actionText.style.fontSize = `12px`;
    actionText.style.lineHeight = `12px`;
    action.appendChild(actionText);
    action.onclick = () => {
      if (this.url === null) {
        return;
      }
      window.open(
        this.url,
        this.target || undefined,
        this.features || undefined
      );
      this.hideDialog();
    };
    dialog.appendChild(action);

    return dialog;
  }

  public showDialog(): void {
    this.dialog.style.display = `flex`;
  }

  public hideDialog(): void {
    this.dialog.style.display = `none`;
  }

  public setDestination(
    url: URL | string,
    target: string,
    features: string
  ): void {
    this.url = url;
    this.target = target;
    this.features = features;
  }
}
