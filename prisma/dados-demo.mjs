// Dados de demonstração: 3 transportadoras, contratos, NFs, licenças (com
// histórico de versões), manuais e o acesso Cliente cliente@translog.com.br / cliente123.
// Usado por `npm run db:demo` e pelo modo demonstração (sem banco conectado).
import bcrypt from "bcryptjs";

const DIA = 86400000;


/** PDF mínimo válido com uma linha de texto. */
function pdf(texto) {
  const t = texto.replace(/[()\\]/g, "");
  const conteudo = `BT /F1 18 Tf 72 720 Td (${t}) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offs = [];
  objs.forEach((o, i) => {
    offs.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const data = new TextEncoder().encode(out);
  return { fileName: `${texto.replace(/[^\w]+/g, "_")}.pdf`, mimeType: "application/pdf", size: data.length, data };
}

/**
 * Popula o banco com dados de demonstração (só se ainda não houver transportadoras).
 * Com `criarAdmin`, cria também o administrador padrão quando não existe nenhum.
 */
export async function popularDemo(prisma, { criarAdmin = false } = {}) {
  if ((await prisma.carrier.count()) > 0) return false;
  // "hoje" no fuso de São Paulo como @db.Date
  const hojeTxt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const hoje = new Date(`${hojeTxt}T00:00:00Z`);
  const d = (dias) => new Date(hoje.getTime() + dias * DIA);

  let admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin && criarAdmin) {
    admin = await prisma.user.create({
      data: { name: "Administrador", email: "admin@consultoria.com.br", passwordHash: await bcrypt.hash("admin123", 10), role: "ADMIN" },
    });
  }
  const log = (action, entityName, entityId, details) =>
    prisma.auditLog.create({ data: { action, entityName, entityId, userId: admin?.id, userName: "Carga de demonstração", details } });

  const transportadoras = [
    { cnpj: "11222333000181", legalName: "TransLog Logística Farmacêutica Ltda", tradeName: "TransLog", contactName: "Marina Souza", contactEmail: "qualidade@translog.com.br", contactPhone: "(11) 4002-8922", city: "Guarulhos", state: "SP", street: "Rod. Presidente Dutra", number: "km 225", district: "Cumbica", zipCode: "07034-000" },
    { cnpj: "45997418000153", legalName: "Rápido Cold Chain Transportes S.A.", tradeName: "Rápido Cold", contactName: "Carlos Lima", contactEmail: "carlos@rapidocold.com.br", contactPhone: "(19) 3232-1000", city: "Campinas", state: "SP" },
    { cnpj: "19131243000197", legalName: "Minas Saúde Cargas Eireli", tradeName: "Minas Saúde", contactName: "Ana Paula", contactEmail: "ana@minassaude.com.br", contactPhone: "(31) 3333-4444", city: "Contagem", state: "MG" },
  ];

  const plano = {
    TransLog: {
      contratos: [["PJ", "Consultoria regulatória anual 2026", 48000, -200, 165], ["SPOT", "Adequação de câmara fria — projeto", 12500, -30, 1]],
      nfs: [["NF-1001", "PJ", 4000, -40, true], ["NF-1002", "PJ", 4000, -10, false], ["NF-1003", "SPOT", 6250, 0, false], ["NF-1004", "PJ", 4000, 20, false]],
      licencas: [["LF-35.2026.0001", "VISA Municipal Guarulhos", 120]],
      manuais: [["Manual de Boas Práticas de Transporte", "MANUAL_BPA", "4.1", 90], ["POP 07 — Higienização de baús", "POP", "2.0", -5]],
    },
    "Rápido Cold": {
      contratos: [["PJ", "Gestão de compliance ANVISA", 60000, -300, -2], ["SPOT", "Validação térmica de rotas", 18000, -15, 45]],
      nfs: [["000456", "PJ", 5000, -60, true], ["000457", "PJ", 5000, -30, true], ["000470", "SPOT", 9000, -3, false]],
      licencas: [["AFE-7.12345.6", "ANVISA", 0]],
      manuais: [["Plano de Qualificação Térmica", "OTHER", "1.0", 1]],
    },
    "Minas Saúde": {
      contratos: [["PJ", "Assessoria técnica — responsável técnico", 36000, -100, 265]],
      nfs: [["2026/77", "PJ", 3000, -5, true], ["2026/78", "PJ", 3000, 25, false]],
      licencas: [["LS-MG-2025-889", "VISA Estadual MG", -12]],
      manuais: [["Manual de Boas Práticas de Armazenagem", "MANUAL_BPA", "3.0", null]],
    },
  };

  for (const t of transportadoras) {
    const c = await prisma.carrier.create({ data: t });
    await log("CREATE", "Carrier", c.id, t);
    const p = plano[t.tradeName];

    const contratos = [];
    for (const [tipo, titulo, valor, inicio, venc] of p.contratos) {
      const f = await prisma.storedFile.create({ data: { ...pdf(`Contrato ${titulo}`), uploadedById: admin?.id } });
      const k = await prisma.contract.create({
        data: { carrierId: c.id, contractType: tipo, title: titulo, amount: valor, startDate: d(inicio), expirationDate: d(venc), fileId: f.id },
      });
      contratos.push(k);
      await log("CREATE", "Contract", k.id, { title: titulo });
    }
    for (const [nf, tipo, valor, venc, pago] of p.nfs) {
      const s = await prisma.financialService.create({
        data: {
          carrierId: c.id,
          contractId: contratos.find((k) => k.contractType === tipo)?.id,
          contractType: tipo,
          invoiceNumber: nf,
          description: tipo === "PJ" ? "Honorários mensais de consultoria" : "Serviço avulso",
          amount: valor,
          dueDate: d(venc),
          status: pago ? "PAID" : "PENDING",
          paymentDate: pago ? d(venc - 1) : null,
        },
      });
      await log("CREATE", "FinancialService", s.id, { invoiceNumber: nf });
    }
    for (const [numero, orgao, venc] of p.licencas) {
      // versão anterior renovada (histórico)
      const f0 = await prisma.storedFile.create({ data: { ...pdf(`Licenca ${numero} v1`), uploadedById: admin?.id } });
      const v1 = await prisma.sanitaryLicense.create({
        data: { carrierId: c.id, licenseNumber: numero, issuingBody: orgao, issueDate: d(venc - 730), expirationDate: d(venc - 365), status: "RENEWED", version: 1, fileId: f0.id },
      });
      const f1 = await prisma.storedFile.create({ data: { ...pdf(`Licenca ${numero} v2`), uploadedById: admin?.id } });
      const v2 = await prisma.sanitaryLicense.create({
        data: { carrierId: c.id, licenseNumber: numero, issuingBody: orgao, issueDate: d(venc - 365), expirationDate: d(venc), version: 2, previousId: v1.id, fileId: f1.id },
      });
      await log("CREATE", "SanitaryLicense", v1.id, { licenseNumber: numero, version: 1 });
      await log("UPDATE", "SanitaryLicense", v1.id, { operacao: "Renovação — versão arquivada" });
      await log("CREATE", "SanitaryLicense", v2.id, { licenseNumber: numero, version: 2 });
    }
    for (const [titulo, cat, versao, revisao] of p.manuais) {
      const f = await prisma.storedFile.create({ data: { ...pdf(titulo), uploadedById: admin?.id } });
      const m = await prisma.goodPracticesManual.create({
        data: { carrierId: c.id, title: titulo, category: cat, version: versao, reviewDate: revisao === null ? null : d(revisao), fileId: f.id },
      });
      await log("CREATE", "GoodPracticesManual", m.id, { title: titulo });
    }
  }

  const cliente = await prisma.user.create({
    data: { name: "Marina Souza (TransLog)", email: "cliente@translog.com.br", passwordHash: await bcrypt.hash("cliente123", 10), role: "CLIENT", carrierCnpj: "11222333000181" },
  });
  await log("CREATE", "User", cliente.id, { email: cliente.email, role: "CLIENT" });
  return true;
}

