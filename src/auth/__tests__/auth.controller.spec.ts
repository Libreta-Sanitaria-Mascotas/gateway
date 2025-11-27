import { AuthController } from '../auth.controller';
import { LoggerService } from '../../common/logger/logger.service';
import { JwtService } from '@nestjs/jwt';
import { of } from 'rxjs';

jest.mock('src/config', () => ({
  AUTH_SERVICE: 'auth',
  USER_SERVICE: 'user',
  envs: {
    jwt: { secret: 'test', expiresIn: '1h' },
  },
}), { virtual: true });

describe('AuthController contracts', () => {
  const authSend = jest.fn();
  const userSend = jest.fn();
  const jwtService = {
    verify: jest.fn(),
  } as unknown as JwtService;

  const controller = new AuthController(
    { send: authSend } as any,
    { send: userSend } as any,
    jwtService,
    new LoggerService('AuthControllerTest'),
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('refresh should forward refresh_token payload', async () => {
    authSend.mockReturnValue(of({ access_token: 'newTok' }));

    const res = await controller.refresh({ refresh_token: 'r1' } as any);

    expect(authSend).toHaveBeenCalledWith({ cmd: 'refresh' }, { refresh_token: 'r1' });
    expect(res.access_token).toBe('newTok');
  });

  it('forgotPassword should include request ip', async () => {
    authSend.mockReturnValue(of({ message: 'ok' }));

    const req = { ip: '9.9.9.9' } as any;
    await controller.forgotPassword(req, { email: 'test@mail.com' } as any);

    expect(authSend).toHaveBeenCalledWith(
      { cmd: 'forgot_password' },
      { email: 'test@mail.com', ip: '9.9.9.9' },
    );
  });

  it('register should forward ip and create user when not exists', async () => {
    authSend.mockReturnValue(of({ access_token: 'tok', refresh_token: 'r', providerData: {} }));
    userSend
      .mockReturnValueOnce(of(undefined)) // find_user_by_credential_id
      .mockReturnValueOnce(of({ id: 'user1' })); // create_user
    jwtService.verify = jest.fn().mockReturnValue({ id: 'cred1' });

    const req = { ip: '1.1.1.1' } as any;
    const dto = { email: 'a@b.com', password: 'secret123', firstName: 'A', lastName: 'B' } as any;

    const res = await controller.register(req, dto);

    expect(authSend).toHaveBeenCalledWith({ cmd: 'register' }, { email: dto.email, password: dto.password, ip: req.ip });
    expect(userSend).toHaveBeenCalledWith({ cmd: 'find_user_by_credential_id' }, { credentialId: 'cred1' });
    expect(userSend).toHaveBeenCalledWith({ cmd: 'create_user' }, { credentialId: 'cred1', firstName: 'A', lastName: 'B' });
    expect(res.credentialId).toBe('cred1');
  });

  it('google login should sync profile without avatar', async () => {
    authSend.mockReturnValue(
      of({
        access_token: 'tok',
        refresh_token: 'r',
        providerData: { name: 'A', family_name: 'B' },
      }),
    );
    userSend
      .mockReturnValueOnce(of(undefined)) // find_user_by_credential_id
      .mockReturnValueOnce(of({ id: 'user1' })); // create_user
    jwtService.verify = jest.fn().mockReturnValue({ id: 'cred1' });

    const res = await controller.googleLogin({ idToken: 'idTok' } as any);

    expect(authSend).toHaveBeenCalledWith({ cmd: 'google_login' }, { idToken: 'idTok' });
    expect(userSend).toHaveBeenCalledWith({ cmd: 'create_user' }, { credentialId: 'cred1', firstName: 'A', lastName: 'B' });
    expect(res.credentialId).toBe('cred1');
  });

  it('logout should send userId', async () => {
    authSend.mockReturnValue(of({ message: 'ok' }));

    const res = await controller.logout({ user: { userId: 'cred1' } } as any);

    expect(authSend).toHaveBeenCalledWith({ cmd: 'logout' }, { userId: 'cred1' });
    expect(res).toEqual({ message: 'ok' });
  });

  it('updateCredentials should forward credentialId', async () => {
    authSend.mockReturnValue(of({ access_token: 'tok', refresh_token: 'r' }));

    const res = await controller.updateCredentials(
      { user: { userId: 'cred1' } } as any,
      { email: 'new@mail.com' } as any,
    );

    expect(authSend).toHaveBeenCalledWith(
      { cmd: 'update_credentials' },
      { credentialId: 'cred1', email: 'new@mail.com' },
    );
    expect(res.access_token).toBe('tok');
  });
});
