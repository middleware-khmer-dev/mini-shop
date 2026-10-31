import { Redirect } from "expo-router";

/** The app opens on the shop; sign-in is only asked for at payment. */
export default function Index() {
  return <Redirect href="/home" />;
}
