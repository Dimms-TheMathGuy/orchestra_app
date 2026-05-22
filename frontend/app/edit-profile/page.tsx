"use client";

import { useState } from "react";

export default function EditProfilePage() {
  const [form, setForm] = useState({
    firstName: "Ina",
    lastName: "Kusuma",
    email: "ina.kusuma@perusahaan1",
    company: "Perusahaan 1",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/users/profile",
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      alert("Profile updated!");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen px-14 py-10 bg-[#ebebeb] dark:bg-[#151515] transition-colors">
      {/* Page Title */}
      <h1 className="text-4xl font-semibold text-zinc-500 dark:text-zinc-400 mb-14">
        Edit Profile
      </h1>

      {/* Profile Header */}
      <div className="flex items-center gap-8 mb-14">
        {/* Avatar */}
        <div className="relative">
          <img
            src="https://i.pravatar.cc/200?img=5"
            alt="profile"
            className="w-28 h-28 rounded-full object-cover"
          />

          {/* Small edit icon */}
          <button className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-xs">
            ✎
          </button>
        </div>

        {/* User Info */}
        <div>
          <h2 className="text-4xl font-semibold text-black dark:text-white">
            {form.firstName} {form.lastName}
          </h2>

          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            {form.email}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-2 gap-x-10 gap-y-8 max-w-5xl">
        <Input
          label="First Name*"
          name="firstName"
          value={form.firstName}
          onChange={handleChange}
        />

        <Input
          label="Last Name*"
          name="lastName"
          value={form.lastName}
          onChange={handleChange}
        />

        <Input
          label="Email*"
          name="email"
          value={form.email}
          onChange={handleChange}
        />

        <Input
          label="Company or Organization*"
          name="company"
          value={form.company}
          onChange={handleChange}
        />
      </div>

      {/* Save Button */}
      <div className="max-w-5xl flex justify-end mt-14">
        <button
          onClick={handleSave}
          className="
            px-10 py-3 rounded-full
            bg-[#f8efff]
            dark:bg-[#f6ebff]
            text-purple-700
            font-semibold
            hover:opacity-90
            transition
          "
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

/* Reusable Input */

function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs italic text-black dark:text-white">
        {label}
      </p>

      <input
        {...props}
        className="
          w-full
          rounded-full
          border
          border-[#8d6ac8]
          dark:border-zinc-700
          bg-transparent
          px-4 py-2
          text-sm
          text-black
          dark:text-white
          outline-none
          focus:ring-2
          focus:ring-purple-400
          transition
        "
      />
    </div>
  );
}