import { jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

type MockedMethods<T extends object> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? jest.Mock<(...args: A) => R>
    : never;
};

describe('AppController', () => {
  let controller: AppController;
  let appServiceMock: MockedMethods<Pick<AppService, 'getHello' | 'getHealth'>>;

  beforeEach(async () => {
    appServiceMock = {
      getHello: jest.fn<() => string>().mockReturnValue('Hello World!'),
      getHealth: jest.fn<() => string>().mockReturnValue('OK'),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: appServiceMock }],
    }).compile();

    controller = moduleRef.get(AppController);
  });

  it('getHello returns the hello message', () => {
    expect(controller.getHello()).toBe('Hello World!');
    expect(appServiceMock.getHello).toHaveBeenCalledTimes(1);
  });

  it('getHealth returns the health message', () => {
    expect(controller.getHealth()).toBe('OK');
    expect(appServiceMock.getHealth).toHaveBeenCalledTimes(1);
  });
});
