import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from "@jest/globals";

const mockDriverApplication = {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
};
const mockDriverProfile = { findOne: jest.fn(), create: jest.fn() };
const mockUser = {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
};
const mockPassengerProfile = {};
const mockUserService = {
    findUserByPhoneOrEmail: jest.fn(),
    generateAndStoreOtp: jest.fn(),
    generateAndSendOtp: jest.fn(),
    verifyOtp: jest.fn(),
    createUserWithProfile: jest.fn(),
    saveProfileImage: jest.fn(),
    findPassengerProfile: jest.fn(),
    savePdfFromParts: jest.fn(),
    processDriverApplicationSubmission: jest.fn(),
    getDriverApplicationStatus: jest.fn(),
    blockUser: jest.fn(),
    loginUser: jest.fn(),
    requestRegisterOtp: jest.fn(),
    updateUserProfile: jest.fn(),
    deleteUser: jest.fn(),
    updateFcmToken: jest.fn(),
    updateLocation: jest.fn(),
    getAllDriverApplications: jest.fn(),
    reviewDriverApplication: jest.fn(),
    getAllUsers: jest.fn(),
    getUserById: jest.fn(),
};

jest.unstable_mockModule("#config/index.js", () => ({
    DriverApplication: mockDriverApplication,
    DriverProfile: mockDriverProfile,
    User: mockUser,
    PassengerProfile: mockPassengerProfile,
}));
jest.unstable_mockModule(
    "../../src/modules/user-module/services/userService.js",
    () => ({ userService: mockUserService })
);

let userFacade;
beforeAll(async () => {
    const mod = await import(
        "../../src/modules/user-module/facades/userFacade.js"
    );
    userFacade = mod.userFacade;
});

describe("userFacade", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("getAllDriverApplications returns applications", async () => {
        mockUserService.getAllDriverApplications.mockResolvedValueOnce([
            { id: 1 },
        ]);
        const result = await userFacade.getAllDriverApplications();
        expect(result).toEqual([{ id: 1 }]);
    });

    it("getAllDriverApplications throws on error", async () => {
        mockUserService.getAllDriverApplications.mockRejectedValueOnce(
            new Error("fail")
        );
        await expect(userFacade.getAllDriverApplications()).rejects.toThrow(
            "fail"
        );
    });

    it("reviewDriverApplication returns null if not found", async () => {
        mockUserService.reviewDriverApplication.mockResolvedValueOnce(null);
        const result = await userFacade.reviewDriverApplication(
            1,
            "approved",
            "ok"
        );
        expect(result).toBeNull();
    });

    it("reviewDriverApplication updates and returns application", async () => {
        const app = { id: 1, status: "approved", comments: "ok" };
        mockUserService.reviewDriverApplication.mockResolvedValueOnce(app);
        const result = await userFacade.reviewDriverApplication(
            1,
            "approved",
            "ok"
        );
        expect(result).toBe(app);
    });

    it("reviewDriverApplication throws on error", async () => {
        mockUserService.reviewDriverApplication.mockRejectedValueOnce(
            new Error("fail")
        );
        await expect(
            userFacade.reviewDriverApplication(1, "approved", "ok")
        ).rejects.toThrow("fail");
    });

    it("getAllUsers returns users", async () => {
        mockUserService.getAllUsers.mockResolvedValueOnce([{ id: 1 }]);
        const result = await userFacade.getAllUsers();
        expect(result).toEqual([{ id: 1 }]);
    });

    it("getAllUsers throws on error", async () => {
        mockUserService.getAllUsers.mockRejectedValueOnce(new Error("fail"));
        await expect(userFacade.getAllUsers()).rejects.toThrow("fail");
    });

    it("getUserById returns user", async () => {
        mockUserService.getUserById.mockResolvedValueOnce({ id: 1 });
        const result = await userFacade.getUserById(1);
        expect(result).toEqual({ id: 1 });
    });

    it("getUserById returns null if not found", async () => {
        mockUserService.getUserById.mockResolvedValueOnce(null);
        const result = await userFacade.getUserById(2);
        expect(result).toBeNull();
    });

    it("getUserById throws on error", async () => {
        mockUserService.getUserById.mockRejectedValueOnce(new Error("fail"));
        await expect(userFacade.getUserById(3)).rejects.toThrow("fail");
    });

    it("requestLoginOtp returns null if user not found", async () => {
        mockUserService.findUserByPhoneOrEmail.mockResolvedValueOnce(null);
        await expect(
            userFacade.requestLoginOtp({ email: "a@b.com" })
        ).rejects.toThrow("User not registered with these details.");
    });

    it("login returns null if user not found", async () => {
        mockUserService.loginUser.mockImplementation(() => {
            throw new Error("User not found with these credentials.");
        });
        await expect(
            userFacade.login({ phoneNumber: "123", otp: "111111" })
        ).rejects.toThrow("User not found with these credentials.");
    });

    it("login throws if OTP fails", async () => {
        mockUserService.loginUser.mockRejectedValueOnce(new Error("fail"));
        await expect(
            userFacade.login({ phoneNumber: "123", otp: "111111" })
        ).rejects.toThrow("fail");
    });

    it("login returns user on success", async () => {
        mockUserService.loginUser.mockResolvedValueOnce({ id: 1 });
        const result = await userFacade.login({
            phoneNumber: "123",
            otp: "111111",
        });
        expect(result).toEqual({ id: 1 });
    });

    it("requestRegisterOtp returns null if user exists", async () => {
        mockUserService.requestRegisterOtp.mockImplementation(() => {
            throw new Error("A user with this phone number already exists.");
        });
        await expect(userFacade.requestRegisterOtp("123")).rejects.toThrow(
            "A user with this phone number already exists."
        );
    });

    it("requestRegisterOtp throws on error", async () => {
        mockUserService.requestRegisterOtp.mockRejectedValueOnce(
            new Error("fail")
        );
        await expect(userFacade.requestRegisterOtp("123")).rejects.toThrow(
            "fail"
        );
    });

    it("createUser returns user on success", async () => {
        mockUserService.verifyOtp = jest.fn().mockResolvedValueOnce();
        mockUserService.createUserWithProfile = jest
            .fn()
            .mockResolvedValueOnce({ id: 2 });
        const result = await userFacade.createUser({
            phoneNumber: "123",
            otp: "111111",
        });
        expect(result).toEqual({ id: 2 });
    });

    it("createUser throws if OTP fails", async () => {
        mockUserService.verifyOtp = jest
            .fn()
            .mockRejectedValueOnce(new Error("fail"));
        await expect(
            userFacade.createUser({ phoneNumber: "123", otp: "111111" })
        ).rejects.toThrow("fail");
    });

    it("updateUser returns null if user not found", async () => {
        mockUserService.updateUserProfile.mockResolvedValueOnce(null);
        const result = await userFacade.updateUser(1, { name: "A" });
        expect(result).toBeNull();
    });

    it("updateUser updates user and returns it", async () => {
        const user = { save: jest.fn(), name: "", profileImage: "", id: 1 };
        mockUserService.updateUserProfile.mockResolvedValueOnce(user);
        const result = await userFacade.updateUser(
            1,
            { name: "A" },
            { buffer: Buffer.from("a"), filename: "img.jpg" }
        );
        expect(result).toBe(user);
    });

    it("updateUser throws on error", async () => {
        mockUserService.updateUserProfile.mockRejectedValueOnce(
            new Error("fail")
        );
        await expect(userFacade.updateUser(1, { name: "A" })).rejects.toThrow(
            "fail"
        );
    });

    it("deleteUser returns false if user not found", async () => {
        mockUserService.deleteUser.mockResolvedValueOnce(false);
        const result = await userFacade.deleteUser(1);
        expect(result).toBe(false);
    });

    it("deleteUser returns true on success", async () => {
        mockUserService.deleteUser.mockResolvedValueOnce(true);
        const result = await userFacade.deleteUser(1);
        expect(result).toBe(true);
    });

    it("deleteUser throws on error", async () => {
        mockUserService.deleteUser.mockRejectedValueOnce(new Error("fail"));
        await expect(userFacade.deleteUser(1)).rejects.toThrow("fail");
    });

    it("updateFcmToken returns null if user not found", async () => {
        mockUserService.updateFcmToken.mockResolvedValueOnce(null);
        const result = await userFacade.updateFcmToken(1, "token");
        expect(result).toBeNull();
    });

    it("updateFcmToken updates user and returns it", async () => {
        const user = { save: jest.fn(), id: 1 };
        mockUserService.updateFcmToken.mockResolvedValueOnce(user);
        const result = await userFacade.updateFcmToken(1, "token");
        expect(result).toBe(user);
    });

    it("updateFcmToken throws on error", async () => {
        mockUserService.updateFcmToken.mockRejectedValueOnce(new Error("fail"));
        await expect(userFacade.updateFcmToken(1, "token")).rejects.toThrow(
            "fail"
        );
    });

    it("updateLocation returns null if user not found", async () => {
        mockUserService.updateLocation.mockResolvedValueOnce(null);
        const result = await userFacade.updateLocation(1, {
            latitude: 1,
            longitude: 2,
        });
        expect(result).toBeNull();
    });

    it("updateLocation updates user and returns it", async () => {
        const user = { save: jest.fn(), id: 1 };
        mockUserService.updateLocation.mockResolvedValueOnce(user);
        const result = await userFacade.updateLocation(1, {
            latitude: 1,
            longitude: 2,
        });
        expect(result).toBe(user);
    });

    it("updateLocation throws on error", async () => {
        mockUserService.updateLocation.mockRejectedValueOnce(new Error("fail"));
        await expect(
            userFacade.updateLocation(1, { latitude: 1, longitude: 2 })
        ).rejects.toThrow("fail");
    });

    it("submitDriverApplication returns null if passenger not found", async () => {
        mockUserService.processDriverApplicationSubmission.mockResolvedValueOnce(
            null
        );
        const result = await userFacade.submitDriverApplication(1, []);
        expect(result).toBeNull();
    });

    it("submitDriverApplication returns null if pending exists", async () => {
        mockUserService.processDriverApplicationSubmission.mockResolvedValueOnce(
            null
        );
        const result = await userFacade.submitDriverApplication(1, []);
        expect(result).toBeNull();
    });

    it("submitDriverApplication creates application and returns it", async () => {
        mockUserService.processDriverApplicationSubmission.mockResolvedValueOnce(
            { id: 4 }
        );
        const result = await userFacade.submitDriverApplication(1, []);
        expect(result).toEqual({ id: 4 });
    });

    it("submitDriverApplication throws on error", async () => {
        mockUserService.processDriverApplicationSubmission.mockRejectedValueOnce(
            new Error("fail")
        );
        await expect(userFacade.submitDriverApplication(1, [])).rejects.toThrow(
            "fail"
        );
    });

    it("getDriverApplicationStatus returns none if no passenger", async () => {
        mockUserService.getDriverApplicationStatus.mockResolvedValueOnce({
            status: "none",
            comments: null,
        });
        const result = await userFacade.getDriverApplicationStatus(1);
        expect(result).toEqual({ status: "none", comments: null });
    });

    it("getDriverApplicationStatus returns none if no application", async () => {
        mockUserService.getDriverApplicationStatus.mockResolvedValueOnce({
            status: "none",
            comments: null,
        });
        const result = await userFacade.getDriverApplicationStatus(1);
        expect(result).toEqual({ status: "none", comments: null });
    });

    it("getDriverApplicationStatus returns status and comments", async () => {
        mockUserService.getDriverApplicationStatus.mockResolvedValueOnce({
            status: "pending",
            comments: "ok",
        });
        const result = await userFacade.getDriverApplicationStatus(1);
        expect(result).toEqual({ status: "pending", comments: "ok" });
    });

    it("getDriverApplicationStatus throws on error", async () => {
        mockUserService.getDriverApplicationStatus.mockRejectedValueOnce(
            new Error("fail")
        );
        await expect(userFacade.getDriverApplicationStatus(1)).rejects.toThrow(
            "fail"
        );
    });

    it("blockUser returns null if user not found", async () => {
        mockUserService.blockUser.mockResolvedValueOnce(null);
        const result = await userFacade.blockUser(1);
        expect(result).toBeNull();
    });

    it("blockUser blocks user and returns it", async () => {
        const user = { save: jest.fn(), id: 1, isBlocked: true };
        mockUserService.blockUser.mockResolvedValueOnce(user);
        const result = await userFacade.blockUser(1);
        expect(result).toBe(user);
    });

    it("blockUser throws on error", async () => {
        mockUserService.blockUser.mockRejectedValueOnce(new Error("fail"));
        await expect(userFacade.blockUser(1)).rejects.toThrow("fail");
    });

    it("submitDriverApplication handles error from savePdfFromParts", async () => {
        mockUserService.processDriverApplicationSubmission.mockRejectedValueOnce(
            new Error("pdf fail")
        );
        await expect(userFacade.submitDriverApplication(1, [])).rejects.toThrow(
            "pdf fail"
        );
    });

    it("getDriverApplicationStatus returns status and null comments if comments missing", async () => {
        mockUserService.getDriverApplicationStatus.mockResolvedValueOnce({
            status: "approved",
            comments: null,
        });
        const result = await userFacade.getDriverApplicationStatus(1);
        expect(result).toEqual({ status: "approved", comments: null });
    });

    afterAll(async () => {
        jest.clearAllMocks();
    });
});
