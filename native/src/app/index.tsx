import { Redirect } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Glass } from "@/components/Glass";
import { useAuth } from "@/lib/auth";

const PHONE_RE = /^0\d{7,9}$/;

function Field(props: { label: string; error?: string } & React.ComponentProps<typeof TextInput>) {
  const { label, error, ...input } = props;
  return (
    <View className="gap-1.5">
      <Text className="text-[13px] font-semibold text-ink">{label}</Text>
      <TextInput
        placeholderTextColor="#a9adb8"
        className={`rounded-2xl border bg-white/70 px-4 py-3 text-[14px] text-ink ${error ? "border-red-500" : "border-glass-line"}`}
        {...input}
      />
      {error ? <Text className="text-[12px] text-red-500">{error}</Text> : null}
    </View>
  );
}

export default function AuthScreen() {
  const { session, ready, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [f, setF] = useState({ fullname: "", phone: "", password: "", confirm: "" });
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  if (ready && session) return <Redirect href="/home" />;

  async function submit() {
    const e: Record<string, string> = {};
    const phone = f.phone.replace(/\s/g, "");
    if (!PHONE_RE.test(phone)) e.phone = "សូមបញ្ចូលលេខទូរស័ព្ទឱ្យត្រឹមត្រូវ";
    if (mode === "login") {
      if (!f.password) e.password = "សូមបញ្ចូលពាក្យសម្ងាត់";
    } else {
      if (f.fullname.trim().length < 2) e.fullname = "សូមបញ្ចូលឈ្មោះពេញ";
      if (f.password.length < 8) e.password = "ពាក្យសម្ងាត់ត្រូវការយ៉ាងតិច ៨ តួអក្សរ";
      if (f.confirm !== f.password) e.confirm = "ពាក្យសម្ងាត់មិនដូចគ្នា";
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      if (mode === "login") await login(phone, f.password);
      else await register(f.fullname.trim(), phone, f.password);
    } catch {
      setErrors({ password: mode === "login" ? "លេខទូរស័ព្ទ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ" : "មិនអាចបង្កើតគណនីបានទេ សូមព្យាយាមម្តងទៀត" });
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerClassName="flex-grow justify-center p-5" keyboardShouldPersistTaps="handled">
        <Glass strong className="mx-auto w-full max-w-[420px] gap-4 rounded-[28px] p-6">
          <View className="items-center gap-1">
            <Text className="text-3xl">🛍️</Text>
            <Text className="text-2xl font-extrabold text-ink">Mini Shop</Text>
          </View>
          <View className="flex-row rounded-full bg-white/50 p-1">
            {(["login", "register"] as const).map((m) => (
              <Pressable key={m} onPress={() => { setMode(m); setErrors({}); }} className={`flex-1 items-center rounded-full py-2.5 ${mode === m ? "bg-[#14141f]" : ""}`}>
                <Text className={`text-[13px] font-bold ${mode === m ? "text-white" : "text-soft"}`}>{m === "login" ? "ចូលប្រើប្រាស់" : "ចុះឈ្មោះ"}</Text>
              </Pressable>
            ))}
          </View>

          {mode === "register" ? <Field label="ឈ្មោះពេញ" placeholder="ឧ. សុវណ្ណារី" value={f.fullname} onChangeText={set("fullname")} error={errors.fullname} /> : null}
          <Field label="លេខទូរស័ព្ទ" placeholder="0XX XXX XXX" keyboardType="phone-pad" autoComplete="tel" value={f.phone} onChangeText={set("phone")} error={errors.phone} />
          <Field label="ពាក្យសម្ងាត់" placeholder="បញ្ចូលពាក្យសម្ងាត់" secureTextEntry value={f.password} onChangeText={set("password")} error={errors.password} />
          {mode === "register" ? <Field label="បញ្ជាក់ពាក្យសម្ងាត់" placeholder="បញ្ចូលម្តងទៀត" secureTextEntry value={f.confirm} onChangeText={set("confirm")} error={errors.confirm} /> : null}

          <Pressable disabled={busy} onPress={submit} className={`items-center rounded-2xl bg-[#14141f] py-3.5 ${busy ? "opacity-60" : ""}`}>
            <Text className="text-[15px] font-bold text-white">{busy ? "..." : mode === "login" ? "ចូលប្រើប្រាស់" : "បង្កើតគណនី"}</Text>
          </Pressable>
        </Glass>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
