import { Log, User, UserManager } from 'oidc-client';

export class AuthService {
  public userManager: UserManager;

  constructor() {
    const settings = {
      authority: process.env.REACT_APP_STS_AUTHORITY, // Constants.stsAuthority,
      client_id: process.env.REACT_APP_CLIENT_ID, // Constants.clientId,
      client_secret: process.env.REACT_APP_CLIENT_SECRET, // Constants.clientSecret,
      redirect_uri: process.env.REACT_APP_CLIENT_ROOT, // Constants.clientRoot,
      silent_redirect_uri: `${process.env.REACT_APP_CLIENT_ROOT}signin-callback.html`,
      // tslint:disable-next-line:object-literal-sort-keys
      post_logout_redirect_uri: `${process.env.REACT_APP_STS_AUTHORITY}api/account/logout`,
      response_type: 'code',
      scope: process.env.REACT_APP_CLIENT_SCOPE // Constants.clientScope
    };
    this.userManager = new UserManager(settings);

    Log.logger = console;
    Log.level = Log.INFO;
  }

  public getUser(): Promise<User | null> {
    return this.userManager.getUser();
  }

  public login(): Promise<void> {
    return this.userManager.signinRedirect();
  }

  public renewToken(): Promise<User> {
    return this.userManager.signinSilent();
  }

  public logout(): Promise<void> {
    window.localStorage.clear();
    window.sessionStorage.clear();
    return this.userManager.signoutRedirect();
  }
}
