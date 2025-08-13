import { zip } from "zip-a-folder";

const main = async () => {
  await zip("./client/dist", "./dist.zip", { destPath: "dist" });
};

main().catch(console.error);
