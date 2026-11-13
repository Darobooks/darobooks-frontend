import PricingFAQ from "./PricingFAQ";

const vendorComparison = [
  ["DaroBooks", "$4", "$10", "$24"],
  ["Zoho Books (US)", "$15", "$40", "$180"],
  ["Wave", "$19", "Not offered", "Not offered"],
  ["FreshBooks", "$23", "$43", "Not offered"],
  ["Xero (US)", "$29", "$50", "$150"],
  ["QuickBooks Online (US)", "$38", "$140", "$420"],
];

export default function PricingDetails() {
  return (
    <>
      <section
        aria-labelledby="how-we-compare-heading"
        className="bg-white py-12 sm:py-16"
      >
        <div className="mx-auto w-full max-w-[1180px] px-6 lg:px-0">
          <h2
            id="how-we-compare-heading"
            className="font-sora text-[25px] font-bold text-[#08172e]"
          >
            How we compare
          </h2>
          <p className="mt-2 max-w-[760px] text-[13px] leading-relaxed text-slate-600">
            US dollars per month at published list prices, billed yearly where
            offered. Where a vendor has a separate edition for your country,
            the local price can differ.
          </p>

          <div className="mt-5 overflow-x-auto rounded-xl border border-[#c7d3ec]">
            <table className="w-full min-w-[650px] table-fixed border-collapse text-left text-[10px] leading-[1.45] sm:text-[11px]">
              <thead className="bg-[#0b1323] text-white">
                <tr>
                  <th scope="col" className="w-[26%] px-3 py-3 font-semibold text-[14px] sm:text-[15px]">
                    Product
                  </th>
                  <th scope="col" className="w-[24%] px-3 py-3 font-semibold text-[14px] sm:text-[15px]">
                    Cheapest paid plan
                  </th>
                  <th scope="col" className="w-[27%] px-3 py-3 font-semibold text-[14px] sm:text-[15px] ">
                    Plan with bank rec and approvals
                  </th>
                  <th scope="col" className="w-[23%] px-3 py-3 font-semibold text-[14px] sm:text-[15px]">
                    Three companies
                  </th>
                </tr>
              </thead>
              <tbody>
                {vendorComparison.map(([product, ...prices], rowIndex) => (
                  <tr
                    key={product}
                    className={`border-t border-[#d5e1ee] ${
                      rowIndex === 0 ? "bg-[#e7f4f7]" : "bg-white"
                    }`}
                  >
                    <th
                      scope="row"
                      className="px-3 py-2.5 font-semibold text-[#08172e]"
                    >
                      {product}
                    </th>
                    {prices.map((price, index) => (
                      <td
                        key={`${product}-${index}`}
                        className="px-3 py-2.5 text-slate-700"
                      >
                        {price}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[9px] leading-relaxed text-slate-500">
            Competitor prices and plan inclusions can change. Check each
            provider&apos;s website for current pricing and details.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="pricing-questions-heading"
        className="bg-[#f4f8fc] py-12 sm:py-16"
      >
        <div className="mx-auto w-full max-w-[880px] px-6 lg:px-0">
          <h2
            id="pricing-questions-heading"
            className="font-sora text-[25px] font-bold text-[#08172e]"
          >
            Questions
          </h2>
          <PricingFAQ />
        </div>
      </section>
    </>
  );
}
