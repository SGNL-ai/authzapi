local typedefs = require "kong.db.schema.typedefs"

return {
  name = "openid_authzen",
  fields = {
    -- {
    --   -- this plugin will only be applied to Services or Routes
    --   consumer = typedefs.no_consumer
    -- },
    -- {
    --   -- this plugin will only run within Nginx HTTP module
    --   protocols = typedefs.protocols_http
    -- },
    {
      config = {
        type = "record",
        fields = {
          -- Plugin's configuration's schema
          {
            server = {
              type = "record",
              fields = {
                -- {
                --   protocol = typedefs.protocol {
                --     default = "http"
                --   },
                -- },
                {
                  pdp_url = {
                    type = "string",
                    default = "https://authzeninteropt.se-plainid.com"
                  },
                }
              },
            },
          },
        },
      },
    },
  },
}
