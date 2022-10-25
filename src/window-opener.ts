export class WindowOpener {
  protected dialog: HTMLDivElement;

  protected destinationURL: URL | string | null = null;
  protected destinationTarget: string | null = null;
  protected destinationFeatures: string | null = null;

  constructor() {
    this.dialog = this.initDialog();

    window.document.body.appendChild(this.dialog);
  }

  protected initDialog(): HTMLDivElement {
    const isJapanese = navigator.language.includes("ja");

    const dialog = window.document.createElement("div");
    dialog.id = "unwallet-provider--window-opener";
    dialog.style.backgroundColor = `#fff`;
    dialog.style.borderRadius = `8px`;
    dialog.style.boxShadow = `0 11px 15px -7px rgb(0 0 0 / 20%), 0 24px 38px 3px rgb(0 0 0 / 14%), 0 9px 46px 8px rgb(0 0 0 / 12%)`;
    dialog.style.display = `none`;
    dialog.style.fontFamily = `Roboto, "Helvetica Neue", sans-serif`;
    dialog.style.position = `absolute`;
    dialog.style.right = `16px`;
    dialog.style.top = `16px`;
    dialog.style.zIndex = `2147483647`;

    const upper = window.document.createElement("div");
    upper.style.display = `flex`;
    upper.style.height = `72px`;
    {
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
      upper.appendChild(logo);

      const body = window.document.createElement("div");
      body.style.display = `flex`;
      body.style.flexDirection = `column`;
      body.style.height = `100%`;
      body.style.justifyContent = `center`;
      body.style.padding = `0 16px 0 0`;
      const title = window.document.createElement("div");
      if (isJapanese) {
        title.innerText = `認証が必要です`;
      } else {
        title.innerText = `Authentication required`;
      }
      title.style.fontSize = `14px`;
      title.style.fontWeight = `bold`;
      title.style.lineHeight = `14px`;
      body.appendChild(title);
      const description1 = window.document.createElement("div");
      if (isJapanese) {
        description1.innerText = `下の「続行」ボタンを押して、unWallet`;
      } else {
        description1.innerText = `Press the "Continue" button below`;
      }
      description1.style.fontSize = `12px`;
      description1.style.lineHeight = `12px`;
      description1.style.margin = `8px 0 0`;
      body.appendChild(description1);
      const description2 = window.document.createElement("div");
      if (isJapanese) {
        description2.innerText = `による認証を続行してください。`;
      } else {
        description2.innerText = `to continue authentication with unWallet.`;
      }
      description2.style.fontSize = `12px`;
      description2.style.lineHeight = `12px`;
      description2.style.margin = `4px 0 0`;
      body.appendChild(description2);
      upper.appendChild(body);
    }
    dialog.appendChild(upper);

    const lower = window.document.createElement("lower");
    lower.style.borderTop = `1px solid #eee`;
    lower.style.color = `#0093a5`;
    lower.style.cursor = `pointer`;
    lower.style.display = `flex`;
    lower.style.height = `40px`;
    lower.style.width = `100%`;
    {
      const action1 = window.document.createElement("div");
      action1.style.alignItems = `center`;
      action1.style.borderRight = `0.5px solid #eee`;
      action1.style.display = `flex`;
      action1.style.height = `100%`;
      action1.style.justifyContent = `center`;
      action1.style.width = `50%`;
      const actionText1 = window.document.createElement("div");
      if (isJapanese) {
        actionText1.innerText = `キャンセル`;
      } else {
        actionText1.innerText = `Cancel`;
      }
      actionText1.style.fontSize = `12px`;
      actionText1.style.lineHeight = `12px`;
      action1.appendChild(actionText1);
      action1.onclick = () => {
        this.hideDialog();
      };
      lower.appendChild(action1);

      const action2 = window.document.createElement("div");
      action2.style.alignItems = `center`;
      action2.style.borderLeft = `0.5px solid #eee`;
      action2.style.display = `flex`;
      action2.style.height = `100%`;
      action2.style.justifyContent = `center`;
      action2.style.width = `50%`;
      const actionText2 = window.document.createElement("div");
      if (isJapanese) {
        actionText2.innerText = `続行`;
      } else {
        actionText2.innerText = `Continue`;
      }
      actionText2.style.fontSize = `12px`;
      actionText2.style.lineHeight = `12px`;
      action2.appendChild(actionText2);
      action2.onclick = () => {
        window.open(
          this.destinationURL || undefined,
          this.destinationTarget || undefined,
          this.destinationFeatures || undefined
        );
        this.hideDialog();
      };
      lower.appendChild(action2);
    }
    dialog.appendChild(lower);

    return dialog;
  }

  public showDialog(url: URL | string, target: string, features: string): void {
    this.destinationURL = url;
    this.destinationTarget = target;
    this.destinationFeatures = features;

    this.dialog.style.display = `block`;
  }

  public hideDialog(): void {
    this.destinationURL = null;
    this.destinationTarget = null;
    this.destinationFeatures = null;

    this.dialog.style.display = `none`;
  }
}
