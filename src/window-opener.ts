export class WindowOpener {
  protected dialog: HTMLDivElement;

  protected logo: HTMLDivElement;
  protected body: HTMLDivElement;
  protected action: HTMLDivElement;

  constructor() {
    const id = "unwallet-provider--window-opener";

    this.dialog = window.document.createElement("div");
    this.dialog.id = id;
    this.dialog.style.backgroundColor = `#fff`;
    this.dialog.style.borderRadius = `8px`;
    this.dialog.style.boxShadow = `0 11px 15px -7px rgb(0 0 0 / 20%), 0 24px 38px 3px rgb(0 0 0 / 14%), 0 9px 46px 8px rgb(0 0 0 / 12%)`;
    this.dialog.style.display = `none`;
    this.dialog.style.fontFamily = `Roboto, "Helvetica Neue", sans-serif`;
    this.dialog.style.height = `72px`;
    this.dialog.style.position = `absolute`;
    this.dialog.style.right = `16px`;
    this.dialog.style.top = `16px`;
    this.dialog.style.zIndex = `2147483647`;

    this.logo = window.document.createElement("div");
    this.logo.style.display = `flex`;
    this.logo.style.flexDirection = `column`;
    this.logo.style.height = `100%`;
    this.logo.style.justifyContent = `center`;
    this.logo.style.padding = `0 16px`;
    const logoImage = window.document.createElement("img");
    logoImage.src = "https://cdn.unwallet.world/assets/img/icon.png";
    logoImage.style.height = `40px`;
    this.logo.appendChild(logoImage);
    this.dialog.appendChild(this.logo);

    this.body = window.document.createElement("div");
    this.body.style.display = `flex`;
    this.body.style.flexDirection = `column`;
    this.body.style.height = `100%`;
    this.body.style.justifyContent = `center`;
    this.body.style.padding = `0 16px 0 0`;
    const title = window.document.createElement("span");
    title.innerText = "認証が必要です";
    title.style.fontSize = `14px`;
    title.style.fontWeight = `bold`;
    title.style.lineHeight = `14px`;
    this.body.appendChild(title);
    const description1 = window.document.createElement("span");
    description1.innerText = "右の「続行」ボタンを押して、unWallet";
    description1.style.fontSize = `12px`;
    description1.style.lineHeight = `12px`;
    description1.style.margin = `8px 0 0`;
    this.body.appendChild(description1);
    const description2 = window.document.createElement("span");
    description2.innerText = "による認証を続行してください。";
    description2.style.fontSize = `12px`;
    description2.style.lineHeight = `12px`;
    description2.style.margin = `4px 0 0`;
    this.body.appendChild(description2);
    this.dialog.appendChild(this.body);

    this.action = window.document.createElement("div");
    this.action.style.borderLeft = `1px solid #eee`;
    this.action.style.color = `#0093a5`;
    this.action.style.cursor = `pointer`;
    this.action.style.display = `flex`;
    this.action.style.flexDirection = `column`;
    this.action.style.height = `100%`;
    this.action.style.justifyContent = `center`;
    this.action.style.padding = `0 16px`;
    const actionText = window.document.createElement("span");
    actionText.innerText = "続行";
    actionText.style.fontSize = `12px`;
    actionText.style.lineHeight = `12px`;
    this.action.appendChild(actionText);
    this.dialog.appendChild(this.action);

    window.document.body.appendChild(this.dialog);

    window.document.addEventListener("click", (ev: MouseEvent) => {
      if (!(ev.target as HTMLElement).closest(`#${id}`)) {
        this.hideDialog();
      }
    });
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
    this.action.onclick = () => {
      window.open(url, target, features);
      this.hideDialog();
    };
  }
}
