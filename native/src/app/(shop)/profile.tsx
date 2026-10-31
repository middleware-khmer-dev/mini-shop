import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Glass } from "@/components/Glass";
import { Icon } from "@/components/Icon";
import { LangSwitch } from "@/components/LangSwitch";
import { Header, Screen } from "@/components/Screen";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function Profile() {
  const { t } = useI18n();
  const { session, logout } = useAuth();
  return (
    <Screen header={<Header title={t("profile.title")} left={<View className="h-10 w-10" />} right={<View className="h-10 w-10" />} />} contentClassName="gap-4 pt-6">
      <Glass strong className="flex-row items-center gap-4 rounded-3xl p-5">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-[#14141f]"><Icon name="user" size={26} color="#fff" /></View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-ink">{session ? session.user.name : t("common.guest")}</Text>
          <Text className="text-[13px] text-soft">{session ? session.user.phone : t("profile.loginHint")}</Text>
        </View>
      </Glass>
      <Glass strong className="flex-row items-center justify-between rounded-2xl p-4">
        <Text className="text-[14px] font-bold text-ink">{t("lang.title")}</Text>
        <LangSwitch />
      </Glass>
      {session ? (
        <Pressable onPress={async () => { await logout(); router.replace("/home"); }} className="items-center rounded-2xl border border-glass-line bg-white/70 py-3.5">
          <Text className="font-bold text-red-500">{t("profile.logout")}</Text>
        </Pressable>
      ) : (
        <Pressable onPress={() => router.push("/login")} className="items-center rounded-2xl bg-[#14141f] py-3.5">
          <Text className="font-bold text-white">{t("profile.login")}</Text>
        </Pressable>
      )}
    </Screen>
  );
}
