import { prisma } from "./prisma";

export async function generateGpSku(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `GP${year}`;

  // Find the highest existing SKU for this year
  const lastWork = await prisma.work.findFirst({
    where: {
      gpSku: {
        startsWith: prefix,
      },
    },
    orderBy: {
      gpSku: "desc",
    },
    select: {
      gpSku: true,
    },
  });

  let nextNumber = 1;
  if (lastWork?.gpSku) {
    const currentNumber = parseInt(lastWork.gpSku.replace(prefix, ""), 10);
    nextNumber = currentNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}
