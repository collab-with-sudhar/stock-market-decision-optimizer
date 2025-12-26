import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginStart, loginSuccess, loginFail } from '../redux/authSlice';
import Navbar from '../components/Navbar';

const Login = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const { loading, error } = useSelector((state) => state.auth);
    const [showPassword, setShowPassword] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);

    useEffect(() => {
        if (location.state?.message) {
            setSuccessMessage(location.state.message);
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const onSubmit = async (data) => {
        dispatch(loginStart());
        try {
            const { authApi } = await import('../api/authApi.js');
            const response = await authApi.login(data);
            if (response.data.success) {
                dispatch(loginSuccess(response.data));
                const redirectTo = location.state?.from || '/';
                navigate(redirectTo, { replace: true });
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Login failed';
            dispatch(loginFail(errorMessage));
        }
    };

    return (
        <div className="w-full min-h-screen bg-[#FDF9F9] dark:bg-[#161212] flex flex-col relative overflow-hidden transition-colors duration-300">

            {}
            <div className="z-50 relative">
                <Navbar />
            </div>

            {}
            <div className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10">

                {}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-landing-primary/10 rounded-full blur-[120px] animate-pulse"></div>
                    <div className="absolute bottom-[10%] right-[20%] w-[400px] h-[400px] bg-landing-primary/5 rounded-full blur-[100px] delay-1000 animate-pulse"></div>
                </div>

                {}
                <div className="w-full max-w-md bg-white dark:bg-[#211A1A] rounded-3xl shadow-xl border border-landing-primary/10 p-8 md:p-10 backdrop-blur-sm relative animate-fade-in-up">

                    <div className="text-center mb-8">

                        <h1 className="text-3xl md:text-4xl font-display font-bold text-landing-text dark:text-white mb-2">
                            Welcome Back
                        </h1>
                        <p className="text-landing-muted dark:text-gray-400">
                            Sign in to access your trading dashboard
                        </p>
                    </div>

                    <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)}>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-landing-text dark:text-gray-200 ml-1">Email Address</label>
                            <div className="relative group">
                                <input
                                    {...register("email", { required: "Email is required" })}
                                    className="w-full h-12 pl-11 pr-4 bg-gray-50 dark:bg-[#161212] border border-gray-200 dark:border-white/10 rounded-xl text-landing-text dark:text-white focus:border-landing-primary focus:ring-4 focus:ring-landing-primary/10 outline-none transition-all"
                                    placeholder="Enter your Email"
                                    type="email"
                                />
                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-landing-primary transition-colors text-[20px]">mail</span>
                            </div>
                            {errors.email && <p className="text-xs text-red-500 ml-1">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-sm font-semibold text-landing-text dark:text-gray-200">Password</label>
                                <Link to="/forgot-password" className="text-xs font-semibold text-landing-primary hover:text-landing-primary-dark transition-colors">Forgot?</Link>
                            </div>
                            <div className="relative group">
                                <input
                                    {...register("password", { required: "Password is required" })}
                                    className="w-full h-12 pl-11 pr-12 bg-gray-50 dark:bg-[#161212] border border-gray-200 dark:border-white/10 rounded-xl text-landing-text dark:text-white focus:border-landing-primary focus:ring-4 focus:ring-landing-primary/10 outline-none transition-all"
                                    placeholder="••••••••"
                                    type={showPassword ? "text" : "password"}
                                />
                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-landing-primary transition-colors text-[20px]">lock</span>
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-0 top-0 h-12 w-12 flex items-center justify-center text-gray-400 hover:text-landing-primary transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">{showPassword ? "visibility" : "visibility_off"}</span>
                                </button>
                            </div>
                            {errors.password && <p className="text-xs text-red-500 ml-1">{errors.password.message}</p>}
                        </div>

                        {successMessage && (
                            <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm font-medium text-center border border-green-100 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-sm">check_circle</span> {successMessage}
                            </div>
                        )}
                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm font-medium text-center border border-red-100 flex items-center justify-center gap-2 animate-shake">
                                <span className="material-symbols-outlined text-sm">error</span> {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 mt-2 bg-gradient-to-r from-landing-primary to-landing-primary-dark hover:to-landing-primary text-white font-bold rounded-xl shadow-lg shadow-landing-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Signing In...</span>
                                </>
                            ) : (
                                <>
                                    Sign In <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Don't have an account? <Link to="/signup" className="font-bold text-landing-primary hover:text-landing-primary-dark">Sign up</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;