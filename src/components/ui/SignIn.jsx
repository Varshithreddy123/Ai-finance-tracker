import React, { useState } from 'react';

const SignInButton = ({ children, loading, disabled, ...props }) => {
  const [clicked, setClicked] = useState(false);

  return (
    <button
      type="submit"
      disabled={disabled || loading}
      onMouseDown={() => setClicked(true)}
      onMouseUp={() => setClicked(false)}
      onMouseLeave={() => setClicked(false)}
      className={`w-full h-14 rounded-xl text-lg font-semibold text-white 
        bg-gradient-to-r from-teal-500 to-indigo-600 
        shadow-lg transition-all duration-150 transform 
        focus:outline-none focus:ring-2 focus:ring-emerald-500
        ${clicked ? 'scale-95 shadow-inner from-teal-600 to-indigo-700' : 'hover:scale-105 hover:shadow-xl hover:from-teal-600 hover:to-indigo-700'}`}
      {...props}
    >
      {loading && (
        <span className="mr-2 inline-block animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
};

export default SignIn;