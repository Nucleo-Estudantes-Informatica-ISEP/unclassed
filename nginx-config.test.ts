import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test.each(["nginx.conf", "deploy.sh"])(
  "%s uses a query-free access log",
  (file) => {
    const config = readFileSync(file, "utf8");
    const formats = [
      ...config.matchAll(/^\s*log_format\s+unclassed\s+([^;]+);/gm),
    ];
    expect(formats).toHaveLength(1);
    expect(formats[0][1].match(/\$\w+/g)).toEqual([
      "$remote_addr",
      "$time_local",
      "$request_method",
      "$uri",
      "$server_protocol",
      "$status",
      "$body_bytes_sent",
    ]);

    const logs = [...config.matchAll(/^\s*access_log\s+([^;]+);/gm)]
      .map(([, directive]) => directive.trim().split(/\s+/))
      .filter(([target]) => target !== "off");
    expect(logs).toHaveLength(1);
    expect(logs[0][1]).toBe("unclassed");
  }
);
